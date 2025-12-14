// Auth JavaScript

// Check URL parameters to determine which form to show
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'register') {
        switchForm('register');
    } else {
        switchForm('login');
    }
});

function switchForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageBox = document.getElementById('messageBox');
    
    messageBox.style.display = 'none';
    
    if (formType === 'register') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function showMessage(message, type) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = 'message-box ' + type;
    messageBox.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
            
            // Store user session
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userEmail', email);
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showMessage(data.message || 'Giriş başarısız. E-posta veya şifre hatalı.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const company = document.getElementById('registerCompany').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // Validate passwords match
    if (password !== passwordConfirm) {
        showMessage('Şifreler eşleşmiyor!', 'error');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        showMessage('Şifre en az 6 karakter olmalıdır!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, company, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Kayıt başarılı! Giriş yapılıyor...', 'success');
            
            // Store user session
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', email);
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showMessage(data.message || 'Kayıt başarısız. Bu e-posta adresi zaten kullanılıyor olabilir.', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    }
}

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('userToken');
    if (token && window.location.pathname === '/auth') {
        window.location.href = '/dashboard';
    }
}

checkAuth();
