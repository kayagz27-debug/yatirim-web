// GITHUB BAĞLANTI BİLGİLERİN
const TOKEN = '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'; 
const OWNER = 'kayagz27-debug';
const REPO = 'yatirim_db';

// SAYFA YÜKLENDİĞİNDE OTURUM KONTROLÜ YAP
window.onload = () => {
    if (localStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app-screen").classList.remove("hidden");
        loadData(); // Sisteme girilmişse verileri çek
    }
};

// 1. LOGIN SİSTEMİ (Basit PIN: 1234)
function login() {
    const pin = document.getElementById("pin-input").value;
    if (pin === "1234") {
        localStorage.setItem("isLoggedIn", "true");
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app-screen").classList.remove("hidden");
        document.getElementById("login-error").classList.add("hidden");
        loadData();
    } else {
        document.getElementById("login-error").classList.remove("hidden");
    }
}

function logout() {
    localStorage.removeItem("isLoggedIn");
    location.reload();
}

// 2. SEKME GEÇİŞLERİ
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.target.classList.add('active');
}

// 3. GITHUB VERİ ÇEKME YARDIMCISI
async function fetchGitHubData(path) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    const res = await fetch(url, { headers: { 'Authorization': `token ${TOKEN}` }});
    const data = await res.json();
    return {
        sha: data.sha,
        content: JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))))
    };
}

// 4. VERİLERİ YÜKLE VE EKRANLARA BAS
async function loadData() {
    try {
        const yatirimDb = await fetchGitHubData('database/yatirimlar.json');
        const piyasaDb = await fetchGitHubData('database/piyasa.json');
        
        const yatirimlar = yatirimDb.content;
        const piyasa = piyasaDb.content;

        // Portföy Tablosunu Doldur
        let totalVal = 0;
        const tbody = document.getElementById('portfoy-body');
        tbody.innerHTML = '';
        
        yatirimlar.forEach(item => {
            const marketItem = piyasa.find(m => m.type === item.type);
            const fiyat = marketItem ? marketItem.currentPrice : 0;
            const itemTotal = fiyat * item.amount;
            totalVal += itemTotal;
            
            let birim = item.type.toLowerCase().includes("gram") ? "Gram" : "Adet";
            
            tbody.innerHTML += `
                <tr>
                    <td>${item.type}</td>
                    <td>${item.amount} ${birim}</td>
                    <td>₺${itemTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                </tr>`;
        });
        document.getElementById('total-portfolio-value').innerText = `Toplam: ₺${totalVal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;

        // Piyasa Sekmesini Doldur
        const piyasaList = document.getElementById('piyasa-listesi');
        piyasaList.innerHTML = '';
        const select = document.getElementById('yatirim-tipi');
        select.innerHTML = ''; // Form Dropdown'ı temizle

        piyasa.forEach(item => {
            // Piyasa Kartı Ekle
            piyasaList.innerHTML += `
                <div class="market-card">
                    <strong>${item.type}</strong>
                    <span>₺${item.currentPrice.toLocaleString('tr-TR')}</span>
                </div>`;
            // Form Dropdown'ına Seçenek Ekle
            select.innerHTML += `<option value="${item.type}">${item.type}</option>`;
        });

    } catch (e) {
        console.error(e);
        document.getElementById('portfoy-body').innerHTML = `<tr><td colspan="3">Veriler çekilemedi.</td></tr>`;
    }
}

// 5. YENİ YATIRIM EKLE (GITHUB'A PUT İSTEĞİ)
async function saveInvestment(event) {
    event.preventDefault(); // Sayfanın yenilenmesini durdur
    
    const btn = document.getElementById('kaydet-btn');
    btn.innerText = "Kaydediliyor...";
    btn.disabled = true;

    try {
        const type = document.getElementById('yatirim-tipi').value;
        const amount = parseFloat(document.getElementById('miktar').value);

        // 1. Dosyanın en güncel halini ve SHA kodunu çek (Üzerine yazmak için şart)
        const fileData = await fetchGitHubData('database/yatirimlar.json');
        const currentArray = fileData.content;

        // 2. Yeni kaydı listeye ekle
        currentArray.push({
            id: Date.now().toString(),
            type: type,
            amount: amount,
            date: new Date().toISOString()
        });

        // 3. Listeyi tekrar Base64 formatına şifrele
        const updatedContent = window.btoa(unescape(encodeURIComponent(JSON.stringify(currentArray, null, 2))));

        // 4. GitHub'a PUT isteği atarak dosyayı güncelle
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/database/yatirimlar.json`;
        await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Web arayüzünden yeni yatırım eklendi.",
                content: updatedContent,
                sha: fileData.sha // Dosyanın üzerine yazmak için bu SHA kodu zorunludur
            })
        });

        // 5. İşlem bitince formu temizle ve portföy ekranına dön
        btn.innerText = "Başarıyla Eklendi!";
        setTimeout(() => {
            document.getElementById('ekle-form').reset();
            btn.innerText = "Portföye Ekle";
            btn.disabled = false;
            loadData(); // Tabloyu yenile
            switchTab('tab-portfoy'); // Portföy sekmesine zıpla
        }, 1500);

    } catch (e) {
        console.error(e);
        alert("Kayıt sırasında bir hata oluştu!");
        btn.innerText = "Portföye Ekle";
        btn.disabled = false;
    }
}