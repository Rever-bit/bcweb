// Kontrat Ayarları - Senden aldığım bilgiler varsayılan olarak eklendi
const DEFAULT_CONTRACT_ADDRESS = "0xa24d828Ec00FD746665777341528ca8367ad82B9";
const DEFAULT_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "num",
				"type": "uint256"
			}
		],
		"name": "store",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "getLength",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "numbers",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "retrieveAll",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "retrieveAt",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Global Web3 Değişkenleri (ethers v6 standardı)
let provider;
let signer;
let contract;
let userAddress = null;

// DOM Elementleri
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletAddressText = document.getElementById("walletAddress");
const contractAddressInput = document.getElementById("contractAddressInput");
const contractAbiInput = document.getElementById("contractAbiInput");
const saveContractBtn = document.getElementById("saveContractBtn");
const contractStatus = document.getElementById("contractStatus");
const mainPanel = document.getElementById("mainPanel");
const contractOwnerText = document.getElementById("contractOwner");
const totalElementsText = document.getElementById("totalElements");
const numberInput = document.getElementById("numberInput");
const storeBtn = document.getElementById("storeBtn");
const refreshBtn = document.getElementById("refreshBtn");
const numbersList = document.getElementById("numbersList");

// Sayfa yüklendiğinde varsayılan input değerlerini doldur
window.addEventListener("DOMContentLoaded", () => {
    contractAddressInput.value = DEFAULT_CONTRACT_ADDRESS;
    contractAbiInput.value = JSON.stringify(DEFAULT_ABI, null, 2);
    
    // Tarayıcıda MetaMask veya benzeri bir cüzdan var mı kontrol et
    if (!window.ethereum) {
        connectWalletBtn.innerText = "MetaMask Gerekli!";
        connectWalletBtn.disabled = true;
        walletAddressText.innerText = "Lütfen tarayıcınıza MetaMask kurun.";
    }
});

// 1. Cüzdan Bağlama Fonksiyonu
async function connectWallet() {
    if (!window.ethereum) return alert("MetaMask yüklü değil!");
    
    try {
        // ethers.js v6 BrowserProvider kurulumu
        provider = new ethers.BrowserProvider(window.ethereum);
        // Kullanıcıdan izin iste
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Arayüzü güncelle
        walletAddressText.innerText = `Bağlı Hesap: ${userAddress}`;
        connectWalletBtn.innerText = "Cüzdan Bağlandı Verisi";
        connectWalletBtn.classList.replace("btn-primary", "btn-secondary");

        // Hesap değişikliklerini dinle
        window.ethereum.on('accountsChanged', (accounts) => {
            window.location.reload();
        });

        // Ağ değişikliklerini dinle
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });

        // Eğer kontrat zaten başlatıldıysa verileri yenile
        if (contract) {
            checkOwnerStatus();
        }

    } catch (error) {
        console.error("Cüzdan bağlanırken hata oluştu:", error);
        alert("Cüzdan bağlantısı reddedildi.");
    }
}

// 2. Kontratı Arayüze Tanımlama Fonksiyonu
function initContract() {
    const address = contractAddressInput.value.trim();
    const abiString = contractAbiInput.value.trim();

    if (!address || !abiString) {
        alert("Lütfen geçerli bir kontrat adresi ve ABI girin!");
        return;
    }

    try {
        const abi = JSON.parse(abiString);
        
        // Eğer cüzdan bağlıysa signer ile (yazma yetkili), bağlı değilse provider ile (sadece okuma yetkili) başlat
        if (signer) {
            contract = new ethers.Contract(address, abi, signer);
        } else if (window.ethereum) {
            const tempProvider = new ethers.BrowserProvider(window.ethereum);
            contract = new ethers.Contract(address, abi, tempProvider);
        } else {
            alert("Kontratı başlatmak için önce cüzdan bağlamanız önerilir.");
            return;
        }

        contractStatus.innerText = "Kontrat Başarıyla Başlatıldı!";
        contractStatus.className = "status-text text-success";
        mainPanel.classList.remove("hidden"); // Ana paneli görünür yap
        
        // Kontrattan verileri çek
        fetchContractData();

    } catch (error) {
        console.error("Kontrat başlatma hatası:", error);
        alert("ABI kodunuz geçersiz JSON formatında olabilir. Kontrol edin.");
    }
}

// 3. Kontrattan Verileri Çekme ve Listeleme
async function fetchContractData() {
    if (!contract) return;

    try {
        // Kontrat Sahibi Adresini Çek
        const ownerAddress = await contract.owner();
        contractOwnerText.innerText = ownerAddress;

        // Toplam Eleman Sayısını Çek
        const length = await contract.getLength();
        totalElementsText.innerText = length.toString();

        // Dizideki Tüm Sayıları Getir
        const allNumbers = await contract.retrieveAll();
        
        // Listeyi Temizle ve Yeniden Doldur
        numbersList.innerHTML = "";
        
        if (allNumbers.length === 0) {
            numbersList.innerHTML = "<li>Dizide henüz kayıtlı bir sayı yok.</li>";
        } else {
            allNumbers.forEach((num, index) => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <strong>İndeks ${index}:</strong> 
                    <span>${num.toString()}</span>
                `;
                numbersList.appendChild(li);
            });
        }

        // Sahibine özel alan kontrolü yap
        checkOwnerStatus(ownerAddress);

    } catch (error) {
        console.error("Veriler çekilirken hata:", error);
    }
}

// 4. Bağlı Kişi Sahip mi Kontrolü (Arayüz Uyarısı İçin)
function checkOwnerStatus(ownerAddress) {
    if (!userAddress || !ownerAddress) return;

    const ownerSection = document.getElementById("ownerSection");
    
    if (userAddress.toLowerCase() === ownerAddress.toLowerCase()) {
        ownerSection.style.border = "2px solid #10b981"; // Yeşil yap (Yetkili)
        ownerSection.querySelector(".zone-notice").innerText = "👑 Tebrikler, Kontrat sahibisiniz! Sayı ekleme yetkiniz var.";
        ownerSection.querySelector(".zone-notice").className = "zone-notice text-success";
    } else {
        ownerSection.style.border = "1px dashed #ef4444"; // Kırmızı yap (Yetkisiz)
        ownerSection.querySelector(".zone-notice").innerText = "🚫 Uyarı: Kontrat sahibi siz değilsiniz. 'store' işlemi hata verecektir.";
        ownerSection.querySelector(".zone-notice").className = "zone-notice text-danger";
    }
}

// 5. Kontrata Sayı Ekleme Fonksiyonu (Yazma İşlemi)
async function storeNumber() {
    if (!contract) return alert("Önce kontratı tanımlamanız gerekiyor!");
    if (!signer) return alert("Lütfen önce cüzdanınızı bağlayın!");

    const value = numberInput.value;
    if (value === "") return alert("Lütfen eklemek için geçerli bir sayı yazın!");

    try {
        storeBtn.disabled = true;
        storeBtn.innerText = "İşlem Bekleniyor...";

        // Kontrattaki store(uint256) fonksiyonunu tetikle
        const tx = await contract.store(BigInt(value));
        
        storeBtn.innerText = "Blockchain Onayı Bekleniyor...";
        // İşlemin blokta onaylanmasını bekle (1 blok yeterli)
        await tx.wait();

        alert(`Başarılı! ${value} sayısı kontrata eklendi.`);
        numberInput.value = ""; // Inputu temizle
        
        // Güncel listeyi çek
        fetchContractData();

    } catch (error) {
        console.error("Transfer hatası:", error);
        // Solidity'den gelen hata mesajını yakalamaya çalışalım
        if (error.reason) {
            alert(`Hata: ${error.reason}`);
        } else {
            alert("İşlem reddedildi veya yetkiniz yok (Sadece Owner ekleyebilir).");
        }
    } finally {
        storeBtn.disabled = false;
        storeBtn.innerText = "Diziye Sayı Ekle (store)";
    }
}

// Event Listeners (Tıklama Olayları)
connectWalletBtn.addEventListener("click", connectWallet);
saveContractBtn.addEventListener("click", initContract);
storeBtn.addEventListener("click", storeNumber);
refreshBtn.addEventListener("click", fetchContractData);