// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CredentialRegistry.sol"; 

contract RegistryTest is Test {
    Registry public registry;
    
    // Tạo sẵn các địa chỉ ví giả lập
    address admin = address(1);
    address bachKhoa = address(2);
    address kinhTe = address(3);
    address hacker = address(4);

    // Dữ liệu giả lập (Mã băm của tấm bằng)
    bytes32 bangCuaSinhVien = keccak256("Du_lieu_bang_cap_A");

    // ==========================================
    // KHAI BÁO LẠI EVENT (Để Foundry biết đường bắt sự kiện)
    // ==========================================
    event IssuerAdded(address indexed university);
    event IssuerRemoved(address indexed university);
    event CredentialRevoked(address indexed issuer, bytes32 indexed merkleRoot);

    // Hàm setUp luôn chạy đầu tiên
    function setUp() public {
        vm.prank(admin);
        registry = new Registry(); // Admin trực tiếp deploy
    }

    // ==========================================
    // NHÓM 1: TEST TÍNH NĂNG ADMIN & EVENT
    // ==========================================

    function test_AdminThemTruongThanhCong_VaPhatEvent() public {
        vm.startPrank(admin);
        
        // Bẫy sự kiện (Kỳ vọng: Có event IssuerAdded được phát ra với địa chỉ bachKhoa)
        // Thông số: true (cho biến indexed 1), false, false, true (cho data)
        vm.expectEmit(true, false, false, true);
        emit IssuerAdded(bachKhoa);
        
        // Thực thi hàm
        registry.addIssuer(bachKhoa);
        vm.stopPrank();

        // Kiểm tra kết quả trong biến mapping
        assertTrue(registry.checkIssuer(bachKhoa));
    }

    function test_AdminXoaTruongThanhCong() public {
        // Cấp quyền trước
        vm.prank(admin);
        registry.addIssuer(bachKhoa);

        // Thu hồi quyền của trường
        vm.prank(admin);
        registry.removeIssuer(bachKhoa);

        assertFalse(registry.checkIssuer(bachKhoa));
    }

    function test_HackerThemTruong_BiChanBoiCustomError() public {
        vm.prank(hacker);
        
        // Kỹ thuật bắt Custom Error (NotAdmin) thay vì chuỗi text
        vm.expectRevert(Registry.NotAdmin.selector);
        registry.addIssuer(hacker);
    }

    // ==========================================
    // NHÓM 2: TEST TÍNH NĂNG THU HỒI BẰNG CẤP
    // ==========================================

    function test_TruongHopLe_ThuHoiBangThanhCong_VaPhatEvent() public {
        // 1. Admin cấp quyền cho Bách Khoa
        vm.prank(admin);
        registry.addIssuer(bachKhoa);

        // 2. Bách Khoa thu hồi bằng
        vm.startPrank(bachKhoa);
        
        // Bẫy sự kiện (Kỳ vọng phát ra CredentialRevoked)
        vm.expectEmit(true, true, false, true);
        emit CredentialRevoked(bachKhoa, bangCuaSinhVien);
        
        registry.revokeCredential(bangCuaSinhVien);
        vm.stopPrank();

        // 3. Kiểm tra bằng đã bị đưa vào sổ đen
        assertTrue(registry.checkRevocation(bachKhoa, bangCuaSinhVien));
    }

    function test_TruongChuaDuocCapQuyen_ThuHoi_BiChanBoiCustomError() public {
        vm.prank(kinhTe); // Kinh tế chưa được thêm vào Registry
        
        // Bắt lỗi Custom Error (NotAuthorizedIssuer)
        vm.expectRevert(Registry.NotAuthorizedIssuer.selector);
        registry.revokeCredential(bangCuaSinhVien);
    }

    // ==========================================
    // NHÓM 3: TEST BẢO MẬT DỮ LIỆU ĐỘC LẬP (LỒNG NHAU)
    // ==========================================

    function test_CacTruongKhongTheThuHoiCheoCuaNhau() public {
        // Cấp quyền cho cả 2 trường
        vm.startPrank(admin);
        registry.addIssuer(bachKhoa);
        registry.addIssuer(kinhTe);
        vm.stopPrank();

        // Bách Khoa thu hồi tấm bằng này
        vm.prank(bachKhoa);
        registry.revokeCredential(bangCuaSinhVien);

        // ĐỐI CHIẾU
        // 1. Ngăn kéo của Bách Khoa -> Bằng này đã bị hủy
        assertTrue(registry.checkRevocation(bachKhoa, bangCuaSinhVien));
        
        // 2. Ngăn kéo của Kinh Tế -> Hoàn toàn không bị ảnh hưởng (Vẫn False)
        assertFalse(registry.checkRevocation(kinhTe, bangCuaSinhVien));
    }
}