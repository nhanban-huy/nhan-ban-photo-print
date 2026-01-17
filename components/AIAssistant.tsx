
import React, { useState, useEffect, useRef } from 'react';
import { parseOrderInput } from '../services/geminiService';
import { OrderItem, PresetService } from '../types';

interface AIAssistantProps {
  onParsed: (items: OrderItem[]) => void;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onParsed, onClose }) => {
  const [mode, setMode] = useState<'menu' | 'chat' | 'voice'>('menu');
  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [presets, setPresets] = useState<PresetService[]>([]);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef(true);
  const shouldRestartSpeech = useRef(false);

  const [volumeData, setVolumeData] = useState<number[]>(new Array(36).fill(3));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isComponentMounted.current = true;
    const saved = localStorage.getItem('nb_preset_services');
    if (saved) setPresets(JSON.parse(saved));
    
    return () => {
      isComponentMounted.current = false;
      stopListening();
      stopVisualizer();
    };
  }, []);

  const startVisualizer = async () => {
    try {
      if (audioContextRef.current) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const update = () => {
        if (analyserRef.current && isComponentMounted.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const raw = Array.from(dataArray).slice(0, 18);
          const mirrored = [...[...raw].reverse(), ...raw];
          const normalized = mirrored.map(v => Math.max(4, (v / 255) * 60));
          setVolumeData(normalized);
          animationFrameRef.current = requestAnimationFrame(update);
        }
      };
      update();
    } catch (e) {
      console.error("Microphone access denied for visualizer:", e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVolumeData(new Array(36).fill(3));
  };

  const handleProcess = async (text: string) => {
    const finalContent = text.trim();
    if (!finalContent) return;
    
    setIsProcessing(true);
    shouldRestartSpeech.current = false;
    stopListening();

    const items = await parseOrderInput(finalContent);
    if (items && items.length > 0) {
      onParsed(items.map((it: any) => ({ 
        ...it, 
        id: Math.random().toString(),
        stt: 0
      })));
      onClose();
    } else {
      setIsProcessing(false);
      alert("AI không nhận diện được đơn hàng. Vui lòng thử nói rõ số lượng và tên dịch vụ.");
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Google Chrome.");

    setSpeechError(null);
    shouldRestartSpeech.current = true;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      if (isComponentMounted.current) {
        setIsListening(true);
        startVisualizer();
        setInterimText('');
      }
    };
    
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (final && isComponentMounted.current) {
        setInputText(prev => (prev + ' ' + final).trim());
        setSpeechError(null); // Xóa lỗi khi có kết quả
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      
      if (event.error === 'no-speech') {
        setSpeechError("Không nghe thấy tiếng... Hãy nói to hơn.");
        // Không set isListening = false ở đây để tránh nháy UI, onend sẽ xử lý restart
      } else if (event.error === 'not-allowed') {
        alert("Bạn cần cho phép quyền truy cập Micro.");
        shouldRestartSpeech.current = false;
        setIsListening(false);
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldRestartSpeech.current && isComponentMounted.current) {
        // Tự động restart nếu bị ngắt do im lặng quá lâu
        try {
          recognitionRef.current.start();
        } catch (e) {
          setIsListening(false);
          stopVisualizer();
        }
      } else {
        setIsListening(false);
        stopVisualizer();
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  };

  const stopListening = () => {
    shouldRestartSpeech.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      setIsListening(false);
      stopVisualizer();
    }
  };

  const addPresetToInput = (serviceName: string) => {
    setInputText(prev => (prev + ' ' + serviceName).trim());
  };

  const fullTextDisplay = (inputText + ' ' + interimText).trim();

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col animate-in fade-in duration-500 overflow-hidden text-slate-900">
      {/* Header */}
      <div className="p-4 md:p-6 flex items-center justify-between bg-white border-b border-slate-200">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all active:scale-90">
          <i className="fas fa-arrow-left text-slate-500 text-lg"></i>
        </button>
        <div className="flex flex-col items-center">
          <div className="flex gap-1.5 mb-1">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} style={{ animationDelay: '200ms' }}></div>
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-yellow-500 animate-pulse' : 'bg-slate-300'}`} style={{ animationDelay: '400ms' }}></div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Assistant Pro</span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto no-scrollbar p-6">
        {mode === 'menu' ? (
          <div className="w-full max-w-md mt-10 md:mt-20 space-y-5 animate-in slide-in-from-bottom-10 duration-700">
            <div className="text-center mb-10">
               <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-3">Chào bạn!</h2>
               <p className="text-slate-500 text-sm font-medium">Bạn muốn nhập đơn bằng cách nào?</p>
            </div>

            <button onClick={() => { setMode('voice'); startListening(); }} className="w-full flex items-center gap-6 p-6 bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 group border border-slate-200">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <i className="fas fa-microphone text-xl"></i>
              </div>
              <div className="text-left">
                <h4 className="font-black text-slate-800 text-lg">Đọc bằng giọng nói</h4>
                <p className="text-slate-500 text-[11px]">AI tự bóc tách số lượng và tên hàng</p>
              </div>
            </button>

            <button onClick={() => setMode('chat')} className="w-full flex items-center gap-6 p-6 bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all active:scale-95 group border border-slate-200">
              <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <i className="fas fa-keyboard text-xl"></i>
              </div>
              <div className="text-left">
                <h4 className="font-black text-slate-800 text-lg">Nhập văn bản/Tin nhắn</h4>
                <p className="text-slate-500 text-[11px]">Copy từ Zalo hoặc gõ phím nhanh</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl h-full flex flex-col pt-4">
            {/* Quick Presets */}
            <div className="mb-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Gợi ý dịch vụ (Click để thêm)</p>
               <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                 {presets.map(p => (
                   <button 
                    key={p.id} 
                    onClick={() => addPresetToInput(p.name)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all"
                   >
                     + {p.name}
                   </button>
                 ))}
               </div>
            </div>

            {mode === 'voice' ? (
              <div className="flex-1 flex flex-col items-center justify-between py-10">
                <div className="w-full px-4 text-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-5 animate-pulse">
                      <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-blue-600 font-black text-xs uppercase tracking-widest">Đang bóc tách đơn hàng...</p>
                    </div>
                  ) : (
                    <div className="min-h-[150px] flex flex-col items-center justify-center gap-4">
                       <p className={`text-2xl md:text-3xl font-black leading-tight tracking-tight transition-colors duration-300 ${fullTextDisplay ? 'text-slate-800' : 'text-slate-300'}`}>
                        {fullTextDisplay || "Hãy đọc yêu cầu của khách..."}
                      </p>
                      {speechError && !interimText && (
                        <p className="text-rose-500 text-xs font-bold uppercase tracking-widest animate-bounce">
                          <i className="fas fa-exclamation-circle mr-2"></i>
                          {speechError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full flex flex-col items-center gap-10">
                   {/* Voice Visualizer */}
                   <div className="flex items-center gap-1.5 h-12">
                      {volumeData.map((h, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-blue-500 rounded-full transition-all duration-75" 
                          style={{ height: isListening ? `${h}px` : '4px', opacity: isListening ? 1 : 0.2 }} 
                        />
                      ))}
                   </div>

                   <div className="flex items-center gap-6">
                      <button 
                        onClick={() => { setInputText(''); setInterimText(''); setSpeechError(null); }} 
                        className="w-14 h-14 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 shadow-sm active:scale-90"
                        title="Xóa nháp"
                      >
                        <i className="fas fa-trash-alt text-lg"></i>
                      </button>

                      <button 
                        onClick={isListening ? stopListening : startListening} 
                        className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isListening ? 'bg-red-500 ring-8 ring-red-100' : 'bg-blue-600 ring-8 ring-blue-50'}`}
                      >
                        {isListening ? (
                          <i className="fas fa-stop text-white text-3xl"></i>
                        ) : <i className="fas fa-microphone text-white text-3xl"></i>}
                      </button>

                      <button 
                        disabled={!fullTextDisplay || isProcessing} 
                        onClick={() => handleProcess(fullTextDisplay)} 
                        className="w-14 h-14 bg-emerald-500 disabled:bg-slate-200 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                        title="Xác nhận"
                      >
                        <i className="fas fa-check text-lg"></i>
                      </button>
                   </div>
                   
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {isListening ? "Hệ thống đang nghe... Hãy nói yêu cầu" : "Nhấn Micro để bắt đầu nói"}
                   </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-6">
                 <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 flex-1 flex flex-col">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Nội dung yêu cầu</h4>
                   <textarea 
                      autoFocus
                      className="w-full flex-1 bg-transparent border-none rounded-3xl font-black text-slate-800 text-xl md:text-2xl outline-none resize-none placeholder:text-slate-200"
                      placeholder="Dán nội dung khách nhắn từ Zalo, Messenger..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                    />
                 </div>
                 <div className="flex gap-4 pb-6">
                    <button onClick={() => setMode('menu')} className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Quay lại</button>
                    <button 
                      disabled={!inputText.trim() || isProcessing} 
                      onClick={() => handleProcess(inputText)} 
                      className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-30"
                    >
                      {isProcessing ? "Đang xử lý..." : "Lên đơn ngay"}
                    </button>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode Switcher Bottom */}
      {mode !== 'menu' && (
        <div className="bg-white p-4 flex justify-center gap-10 border-t border-slate-200">
          <button 
            onClick={() => { setMode('chat'); stopListening(); }} 
            className={`flex flex-col items-center gap-1.5 transition-all ${mode === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <i className="fas fa-keyboard text-lg"></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">Bàn phím</span>
          </button>
          <button 
            onClick={() => { setMode('voice'); startListening(); }} 
            className={`flex flex-col items-center gap-1.5 transition-all ${mode === 'voice' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <i className="fas fa-microphone text-lg"></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">Giọng nói</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
