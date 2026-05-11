// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Registry {
    
    // 1. Tối ưu Gas: Từ khóa immutable
    address public immutable admin;

    mapping(address => bool) public isAuthorizedIssuer;
    mapping(address => mapping(bytes32 => bool)) public isRevoked;

    // 2. Tối ưu Gas: Lỗi tùy chỉnh (Custom Errors)
    error NotAdmin();
    error NotAuthorizedIssuer();

    // 4. Khả năng tương tác: Sự kiện (Events)
    event IssuerAdded(address indexed university);
    event IssuerRemoved(address indexed university);
    event CredentialRevoked(address indexed issuer, bytes32 indexed merkleRoot);

    // 3. Thiết kế: Trạm gác Modifier
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender; 
    }

    // Đổi public thành external để tiết kiệm Gas (vì chỉ gọi từ bên ngoài)
    function addIssuer(address _university) external onlyAdmin {
        isAuthorizedIssuer[_university] = true;
        emit IssuerAdded(_university); // Đánh chuông báo hiệu
    }

    function removeIssuer(address _university) external onlyAdmin {
        isAuthorizedIssuer[_university] = false;
        emit IssuerRemoved(_university);
    } 

    function checkIssuer(address _university) external view returns (bool) {
        return isAuthorizedIssuer[_university];
    }

    function revokeCredential(bytes32 _merkleRoot) external {
        if (!isAuthorizedIssuer[msg.sender]) revert NotAuthorizedIssuer();
        
        isRevoked[msg.sender][_merkleRoot] = true;
        emit CredentialRevoked(msg.sender, _merkleRoot);
    }

    function checkRevocation(address _issuer, bytes32 _merkleRoot) external view returns (bool) {
        return isRevoked[_issuer][_merkleRoot];
    }
}