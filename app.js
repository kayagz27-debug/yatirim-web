// GITHUB YETKİLENDİRME (Kendi bilgilerini gir)
const TOKEN_PART_1 = 'ghp_'; 
const TOKEN_PART_2 = 'FyxHdQMr5A4kODCHjVc25jrgrE7dJX113OO9'; 
const TOKEN = TOKEN_PART_1 + TOKEN_PART_2;
const OWNER = 'kayagz27-debug'; 
const REPO = 'yatirim-web';

let isLoginMode = true;
let aktifKullanici = localStorage.getItem("aktifKullanici");

window.onload = () => {
    if (aktifKullanici) {
        girisBasarili(aktifKullanici);
    }
};

// 1. ENTER TUŞU YAKALAYICI
function enterKontrol(event) {
    if (event.key === "Enter") {
        kullaniciIslemi();
    }
}

// 2. FORM DEĞİŞTİR (Form Temizleme Eklendi)
function formDegistir() {
    isLoginMode = !isLoginMode;
    document.getElementById('form-title').innerText = isLoginMode ? "Sisteme Giriş" : "Yeni Kayıt Oluştur";
    document.getElementById('action-btn').innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
    document.getElementById('toggle-btn').innerText = isLoginMode ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap";
    document.getElementById('auth-error').classList.add('hidden');
    
    // INPUTLARI TEMİZLE
    document.getElementById("username-input").value = "";
    document.getElementById("password-input").value = "";
}

function gosterHata(mesaj) {
    const errorBox = document.getElementById('auth-error');
    errorBox.innerText = mesaj;
    errorBox.classList.remove('hidden');
}

function girisBasarili(username) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("active-user-display").innerText = "@" + username;
    baslat();
}

async function fetchGitHubData(path) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    const res = await fetch(url, { 
        method: 'GET',
        headers: { 
            'Authorization': 'token ' + TOKEN,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (!res.ok) {
        if (res.status === 404) return null; // Dosya yoksa null dön
        throw new Error("Dosya okunamadı: " + path);
    }
    
    const data = await res.json();
    return {
        sha: data.sha,
        content: JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))))
    };
}

async function writeGitHubData(path, contentObj, sha, message) {
    const updatedContent = window.btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2))));
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    
    await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, content: updatedContent, sha: sha })
    });
}

// 3. API'DEN CANLI PİYASA ÇEKME VE DB GÜNCELLEME (LAZY SYNC)
async function piyasaGuncelle(piyasaDb) {
    const now = Date.now();
    const sonGuncelleme = piyasaDb.content.lastUpdate || 0;
    
    // Eğer veriler 1 saatten (3600000 ms) eskiyse API'den yeni veri çek
    if (now - sonGuncelleme > 3600000) {
        try {
            // Ücretsiz, CORS takılmayan güncel finans API'si
            const apiRes = await fetch("https://finans.truncgil.com/today.json");
            const canlıVeri = await apiRes.json();

            // Sadece takip ettiğimiz kalemleri eşleştir
            const yeniPiyasaListesi = [
                { type: "Gram Altın", currentPrice: parseFloat(canlıVeri["Gram Altın"].Satış.replace('.', '').replace(',', '.')) },
                { type: "Çeyrek Altın", currentPrice: parseFloat(canlıVeri["Çeyrek Altın"].Satış.replace('.', '').replace(',', '.')) },
                { type: "Yarım Altın", currentPrice: parseFloat(canlıVeri["Yarım Altın"].Satış.replace('.', '').replace(',', '.')) },
                { type: "Tam Altın", currentPrice: parseFloat(canlıVeri["Tam Altın"].Satış.replace('.', '').replace(',', '.')) },
                { type: "Dolar (USD)", currentPrice: parseFloat(canlıVeri["ABD DOLARI"].Satış.replace('.', '').replace(',', '.')) },
                { type: "Euro (EUR)", currentPrice: parseFloat(canlıVeri["EURO"].Satış.replace('.', '').replace(',', '.')) }
            ];

            const yeniPiyasaObj = {
                lastUpdate: now,
                items: yeniPiyasaListesi
            };

            await writeGitHubData('database/piyasa.json', yeniPiyasaObj, piyasaDb.sha, "Sistem: Piyasa verileri otomatik güncellendi");
            return yeniPiyasaObj.items;
            
        } catch (error) {
            console.error("Canlı API çekilemedi, eski veri kullanılıyor.", error);
            return piyasaDb.content.items || [];
        }
    }
    return piyasaDb.content.items || [];
}

async function kullaniciIslemi() {
    const username = document.getElementById("username-input").value.trim();
    const password = document.getElementById("password-input").value.trim();
    const btn = document.getElementById("action-btn");
    
    document.getElementById('auth-error').classList.add('hidden');
    if (!username || !password) { gosterHata("Kullanıcı veya şifre boş olamaz."); return; }
    
    btn.innerText = "Bekleyin...";
    btn.disabled = true;

    try {
        let fileData = await fetchGitHubData('database/kullanicilar.json');
        if (!fileData) {
            await writeGitHubData('database/kullanicilar.json', [], null, "Kullanıcılar DB oluşturuldu");
            fileData = await fetchGitHubData('database/kullanicilar.json');
        }
        
        const users = fileData.content;

        if (isLoginMode) {
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                localStorage.setItem("aktifKullanici", username);
                aktifKullanici = username;
                girisBasarili(username);
            } else {
                gosterHata("Hatalı kullanıcı adı veya şifre!");
            }
        } else {
            if (users.find(u => u.username === username)) {
                gosterHata("Bu kullanıcı adı alınmış!");
            } else {
                users.push({ username: username, password: password });
                await writeGitHubData('database/kullanicilar.json', users, fileData.sha, "Yeni Kullanıcı");
                alert("Kayıt başarılı! Giriş yapabilirsiniz.");
                formDegistir();
            }
        }
    } catch (e) {
        gosterHata("Sistemsel Hata: " + e.message);
    } finally {
        btn.innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
        btn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem("aktifKullanici");
    location.reload();
}

async function baslat() {
    try {
        // DB'leri Çek (Yoksa null döner)
        let yatirimDb = await fetchGitHubData('database/yatirimlar.json');
        let piyasaDb = await fetchGitHubData('database/piyasa.json');
        let altinOranlariDb = await fetchGitHubData('database/altin_oranlari.json');

        // Dosyalar yoksa başlangıç verileriyle oluştur
        if (!yatirimDb) {
            await writeGitHubData('database/yatirimlar.json', [], null, "Init");
            yatirimDb = await fetchGitHubData('database/yatirimlar.json');
        }
        if (!piyasaDb) {
            await writeGitHubData('database/piyasa.json', {lastUpdate: 0, items: []}, null, "Init");
            piyasaDb = await fetchGitHubData('database/piyasa.json');
        }
        // MASTER DATA OLUŞTURMA (Gram Karşılıkları)
        if (!altinOranlariDb) {
            const baseOranlar = {
                "Gram Altın": 1.0,
                "Çeyrek Altın": 1.75,
                "Yarım Altın": 3.50,
                "Tam Altın": 7.0,
                "Dolar (USD)": 0, // Altın değil
                "Euro (EUR)": 0
            };
            await writeGitHubData('database/altin_oranlari.json', baseOranlar, null, "Altin oranlari master data eklendi");
            altinOranlariDb = await fetchGitHubData('database/altin_oranlari.json');
        }

        // Piyasayı Senkronize Et (Lazy Sync)
        const piyasa = await piyasaGuncelle(piyasaDb);
        const altinOranlari = altinOranlariDb.content;
        const yatirimlar = yatirimDb.content.filter(item => item.sahibi === aktifKullanici);

        // ARAYÜZÜ ÇİZ
        let totalVal = 0;
        const tbody = document.getElementById('portfoy-body');
        tbody.innerHTML = '';
        
        if (yatirimlar.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Portföy boş.</td></tr>`;
        }

        yatirimlar.forEach(item => {
            const marketItem = piyasa.find(m => m.type === item.type);
            const fiyat = marketItem ? marketItem.currentPrice : 0;
            const itemTotal = fiyat * item.amount;
            totalVal += itemTotal;
            
            let birim = item.type.includes("Altın") ? "Adet" : (item.type.includes("Gram") ? "Gram" : "Birim");
            
            // GRAM HESAPLAMA EKRANA BASMA
            let safGramText = "-";
            if (altinOranlari[item.type] > 0) {
                const totalGram = (item.amount * altinOranlari[item.type]).toFixed(2);
                safGramText = `<span class="gram-badge">${totalGram} gr</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${item.type}</td>
                    <td>${item.amount} ${birim}</td>
                    <td>${safGramText}</td>
                    <td>₺${itemTotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                </tr>`;
        });
        document.getElementById('total-portfolio-value').innerText = `Toplam: ₺${totalVal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;

        // PİYASA LİSTELERİ
        const select = document.getElementById('yatirim-tipi');
        const piyasaList = document.getElementById('piyasa-listesi');
        select.innerHTML = '';
        piyasaList.innerHTML = '';

        piyasa.forEach(item => {
            select.innerHTML += `<option value="${item.type}">${item.type}</option>`;
            piyasaList.innerHTML += `
                <div class="market-item">
                    ${item.type}
                    <span>₺${item.currentPrice.toLocaleString('tr-TR')}</span>
                </div>`;
        });

        // Son Güncelleme Yazısı
        const snGuncelleme = new Date(piyasaDb.content.lastUpdate || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('piyasa-guncelleme-bilgisi').innerText = `Son Güncelleme: ${snGuncelleme}`;

    } catch (e) {
        console.error(e);
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.target.classList.add('active');
}

async function saveInvestment(event) {
    event.preventDefault(); 
    const btn = document.getElementById('kaydet-btn');
    btn.innerText = "Kaydediliyor...";
    btn.disabled = true;

    try {
        const type = document.getElementById('yatirim-tipi').value;
        const amount = parseFloat(document.getElementById('miktar').value);
        let fileData = await fetchGitHubData('database/yatirimlar.json');
        
        const currentArray = fileData.content;
        currentArray.push({
            id: Date.now().toString(),
            sahibi: aktifKullanici, 
            type: type,
            amount: amount,
            date: new Date().toISOString()
        });

        await writeGitHubData('database/yatirimlar.json', currentArray, fileData.sha, "Yatirim eklendi");

        btn.innerText = "Başarıyla Eklendi!";
        setTimeout(() => {
            document.getElementById('ekle-form').reset();
            btn.innerText = "Portföye Ekle";
            btn.disabled = false;
            baslat(); 
            switchTab('tab-portfoy'); 
        }, 1500);

    } catch (e) {
        alert("Hata oluştu!");
        btn.innerText = "Portföye Ekle";
        btn.disabled = false;
    }
}
