import Web3 from "web3";
import RegistryData from "./Registry.json"; 

const CONTRACT_ADDRESS = "0x45b0f6A20f44A0Aa3416C9b8338e38C83256724a";
const CONTRACT_ABI = RegistryData.abi; 

export const initWeb3 = async () => {
  if (typeof window !== "undefined" && window.ethereum) {
    try {
      const web3 = new Web3(window.ethereum);
      
      // 1. Yêu cầu kết nối ví
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      // 2. ÉP CHUYỂN SANG MẠNG SEPOLIA (Fix lỗi Review Alert)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // 0xaa36a7 là mã Hex của 11155111
        });
      } catch (switchError) {
        // Nếu mạng Sepolia chưa có trong danh sách MetaMask, yêu cầu thêm vào
        if (switchError.code === 4902) {
          alert("Vui lòng thêm mạng Sepolia vào MetaMask của bạn!");
        }
      }

      const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
      
      console.log("Connected Account:", accounts[0]);
      console.log("Contract Ready at:", CONTRACT_ADDRESS);

      return { web3, contract, account: accounts[0] };
    } catch (error) {
      console.error("Lỗi khi kết nối Web3:", error);
      return null;
    }
  } else {
    alert("Vui lòng cài đặt MetaMask!");
    return null;
  }
};