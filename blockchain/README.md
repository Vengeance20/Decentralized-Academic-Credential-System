# 🚀 Phân hệ Blockchain - Quản lý Văn bằng (Smart Contract)

Phân hệ này chứa mã nguồn Smart Contract đã được viết bằng Foundry và triển khai thành công lên mạng thử nghiệm **Sepolia Testnet**.

## 📌 Thông tin Triển khai (Dành cho Frontend & Backend)

Để gọi các hàm tương tác với Smart Contract, các thành viên sử dụng thông tin sau:

* **Mạng lưới:** Sepolia Testnet (Chain ID: `11155111`)
* **Địa chỉ Contract (Registry):** `0x_0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a`
* **Trình khám phá (Etherscan):** [Xem hợp đồng trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0x_0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a)

### 📂 Lấy File ABI ở đâu?
Vì thư mục `out/` tự sinh ra của Foundry rất nặng nên đã bị bỏ qua (gitignore) khi đẩy lên GitHub. Các bạn Frontend/Backend lấy "bản vẽ kỹ thuật" của hợp đồng (File ABI) tại đường dẫn sau:

👉 **`blockchain/abis/Registry.json`** *(Trong file JSON này sẽ chứa toàn bộ các hàm như `revokeCredential`, `verifyCredential`,...)*

---

## 💻 Hướng dẫn cho Developer (Cài đặt & Chạy local)

Nếu muốn tự build lại hoặc kiểm tra Smart Contract trên máy cá nhân (Chạy bằng Linux), hãy thực hiện các bước sau:

**1. Cài đặt các thư viện phụ thuộc:**
```forge install```

**2. Biên dịch code:
(Lệnh này sẽ tự động tạo lại thư mục out/ trên máy của bạn)**
```forge build```
**3. Chạy test (nếu có):**
```forge test```
