import sys
import os

# Chỉ định chính xác đường dẫn đến thư mục chứa 'academic_credential'
# Dựa trên thông tin Minh vừa cung cấp: backend/dev/
current_dir = os.path.dirname(os.path.abspath(__file__))
target_path = os.path.join(current_dir, "backend", "dev")

# Thêm vào hệ thống tìm kiếm của Python
sys.path.append(target_path)

try:
    from academic_credential.crypto.ecc import generate_key_pair
    
    print(f"--> Đã kết nối thành công tới thư viện tại: {target_path}")
    print("--- ĐANG KHỞI TẠO KHÓA THẬT ---")
    
    priv, pub = generate_key_pair()
    
    # Lưu file ngay tại thư mục gốc DigitalDiploma để dễ dùng
    with open("issuer_private_key.pem", "w") as f:
        f.write(priv)
    with open("issuer_public_key.pem", "w") as f:
        f.write(pub)
    
    print("-" * 30)
    print("THÀNH CÔNG RỒI!")
    print("Minh nhìn lại folder DigitalDiploma sẽ thấy 2 file .pem vừa xuất hiện.")
    print("-" * 30)
    
except ImportError:
    print(f"X Lỗi: Vẫn không thấy thư mục 'academic_credential' trong {target_path}")
    print("Minh kiểm tra xem chữ 'dev' có viết hoa hay không, hoặc trong 'dev' có folder 'academic_credential' chưa nhé.")
except Exception as e:
    print(f"Lỗi phát sinh: {e}")