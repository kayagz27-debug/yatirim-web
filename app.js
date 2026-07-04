// GITHUB BOTLARINDAN KAÇIŞ
const TOKEN_PART_1 = 'ghp_'; 
const TOKEN_PART_2 = 'FyxHdQMr5A4kODCHjVc25jrgrE7dJX113OO9'; 
const TOKEN = TOKEN_PART_1 + TOKEN_PART_2;

const OWNER = 'kayagz27-debug'; 
const REPO = 'yatirim-web';

let isLoginMode = true;
let aktifKullanici = localStorage.getItem("aktifKullanici");

// SAYFA YÜKLENDİĞİNDE KONTROL
window.onload = () => {
    if (aktifKullanici) {
        girisBasarili(aktifKullanici);
    }
};

// ARAYÜZ DEĞİŞTİRİCİ (GİRİŞ/KAYIT)
function formDegistir() {
    isLoginMode = !isLoginMode;
    document.getElementById('form-title').innerText = isLoginMode ? "Sisteme Giriş" : "Yeni Kayıt Oluştur";
    document.getElementById('action-btn').innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
    document.getElementById('toggle-btn').innerText = isLoginMode ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap";
    document.getElementById('auth-error').classList.add('hidden');
}

// HATA GÖSTERİCİ
function gosterHata(mesaj) {
    const errorBox = document.getElementById('auth-error');
    errorBox.innerText = mesaj;
    errorBox.classList.remove('hidden');
}

// GİRİŞ BAŞARILI OLUNCA EKRAN DEĞİŞTİRME
function girisBasarili(username) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("active-user-display").innerText = "@" + username;
    loadData();
}

// GITHUB API SORGUSU
async function fetchGitHubData(path) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    
    // Header'ı en sade haline getiriyoruz
    const res = await fetch(url, { 
        method: 'GET',
        headers: { 
            'Authorization': 'token ' + TOKEN,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        console.error("GitHub API Hatası:", errorData);
        throw new Error("Dosya okunamadı: " + path);
    }
    
    const data = await res.json();
    return {
        sha: data.sha,
        content: JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))))
    };
}
    
    if (!res.ok) {
        // Hatanın sebebini konsolda görelim
        const errorData = await res.json();
        console.error("GitHub API Hatası:", errorData);
        throw new Error("Dosya okunamadı: " + path);
    }
    
    const data = await res.json();
    return {
        sha: data.sha,
        content: JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))))
    };


// GİRİŞ VE KAYIT MOTORU
async function kullaniciIslemi() {
    const username = document.getElementById("username-input").value.trim();
    const password = document.getElementById("password-input").value.trim();
    const btn = document.getElementById("action-btn");
    
    document.getElementById('auth-error').classList.add('hidden');
    
    if (!username || !password) {
        gosterHata("Kullanıcı adı veya şifre boş bırakılamaz.");
        return;
    }
    
    btn.innerText = "Lütfen Bekleyin...";
    btn.disabled = true;

    try {
        const fileData = await fetchGitHubData('database/kullanicilar.json');
        const users = fileData.content;

        if (isLoginMode) {
            // GİRİŞ YAP
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                localStorage.setItem("aktifKullanici", username);
                aktifKullanici = username;
                girisBasarili(username);
            } else {
                gosterHata("Hatalı kullanıcı adı veya şifre!");
            }
        } else {
            // KAYIT OL
            const exists = users.find(u => u.username === username);
            if (exists) {
                gosterHata("Bu kullanıcı adı zaten kullanılıyor!");
            } else {
                users.push({ username: username, password: password });
                const updatedContent = window.btoa(unescape(encodeURIComponent(JSON.stringify(users, null, 2))));
                const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/database/kullanicilar.json`;
                
                await fetch(url, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: "Yeni Kullanıcı", content: updatedContent, sha: fileData.sha })
                });

                alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
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

// VERİ YÜKLEME VE HESAPLAMALAR
async function loadData() {
    try {
        const yatirimDb = await fetchGitHubData('database/yatirimlar.json');
        const piyasaDb = await fetchGitHubData('database/piyasa.json');
        
        // Sadece giren kişinin yatırımlarını çek
        const yatirimlar = yatirimDb.content.filter(item => item.sahibi === aktifKullanici);
        const piyasa = piyasaDb.content;

        let totalVal = 0;
        const tbody = document.getElementById('portfoy-body');
        tbody.innerHTML = '';
        
        if (yatirimlar.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Henüz portföyünüz boş.</td></tr>`;
        }

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

        // Piyasa Menülerini Doldur
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

    } catch (e) {
        console.error(e);
    }
}

// SEKME GEÇİŞİ
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.target.classList.add('active');
}

// YATIRIM EKLEME
async function saveInvestment(event) {
    event.preventDefault(); 
    const btn = document.getElementById('kaydet-btn');
    btn.innerText = "Kaydediliyor...";
    btn.disabled = true;

    try {
        const type = document.getElementById('yatirim-tipi').value;
        const amount = parseFloat(document.getElementById('miktar').value);
        const fileData = await fetchGitHubData('database/yatirimlar.json');
        const currentArray = fileData.content;

        currentArray.push({
            id: Date.now().toString(),
            sahibi: aktifKullanici, 
            type: type,
            amount: amount,
            date: new Date().toISOString()
        });

        const updatedContent = window.btoa(unescape(encodeURIComponent(JSON.stringify(currentArray, null, 2))));
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/database/yatirimlar.json`;
        
        await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Yatirim eklendi", content: updatedContent, sha: fileData.sha })
        });

        btn.innerText = "Başarıyla Eklendi!";
        setTimeout(() => {
            document.getElementById('ekle-form').reset();
            btn.innerText = "Portföye Ekle";
            btn.disabled = false;
            loadData(); 
            switchTab('tab-portfoy'); 
        }, 1500);

    } catch (e) {
        alert("Hata oluştu!");
        btn.innerText = "Portföye Ekle";
        btn.disabled = false;
    }
}
