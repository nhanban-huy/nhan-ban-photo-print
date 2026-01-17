export async function uploadImageToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "nhanban_unsigned");
  formData.append("folder", "nhanban/products");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/ddi2aggqq/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Upload ảnh thất bại");
  }

  const data = await res.json();
  return data.secure_url;
}
