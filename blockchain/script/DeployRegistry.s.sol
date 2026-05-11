// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CredentialRegistry.sol";

contract DeployRegistry is Script {
    function run() external {
        // Đọc Private Key từ file .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Bắt đầu gửi giao dịch lên mạng
        vm.startBroadcast(deployerPrivateKey);

        // Khởi tạo hợp đồng
        new Registry();

        vm.stopBroadcast();
    }
}