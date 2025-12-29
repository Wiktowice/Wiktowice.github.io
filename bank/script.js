document.addEventListener("DOMContentLoaded", function(){

    let users = [];

    // Wczytaj konto.json z Neocities
    fetch('konto.json')
      .then(res => res.text())
      .then(txt => {
          try {
              users = JSON.parse(txt);
              if(!Array.isArray(users)) throw "konto.json nie jest tablicą!";
              console.log("Konta wczytane:", users);
          } catch(e) {
              console.error("Błąd parsowania JSON:", e);
          }
      })
      .catch(err => console.error("Błąd wczytywania kont:", err));

    // Dźwięk kliknięcia
    function playClick(){ 
        const audio=document.getElementById("click-sound"); 
        if(audio) audio.play(); 
    }
    window.playClick = playClick;

    // ---- Logowanie użytkownika ----
    window.login = function(){
        const loginVal = document.getElementById("login").value.trim();
        const passwordVal = document.getElementById("password").value.trim();
        const errorElem = document.getElementById("login-error");

        if(!users.length){
            errorElem.textContent = "Trwa wczytywanie kont… spróbuj za chwilę.";
            return;
        }

        const user = users.find(u => String(u.login)===loginVal && String(u.haslo)===passwordVal);

        if(user){
            document.getElementById("login-window").style.display="none";
            document.getElementById("account-window").style.display="block";
            document.getElementById("user-name").textContent=user.login;
            document.getElementById("user-id").textContent=user.id;
            document.getElementById("user-saldo").textContent="$"+user.saldo;
            errorElem.textContent="";
        } else {
            errorElem.textContent="Nieprawidłowy login lub hasło!";
        }
    }

    window.logout = function(){
        document.getElementById("account-window").style.display="none";
        document.getElementById("login-window").style.display="block";
    }

    // ---- Panel admina ----
    const ADMIN_PASSWORD = "WiktowiceAdmin123";

    window.adminLogin = function(){
        const pw = document.getElementById("admin-password").value.trim();
        const errorElem = document.getElementById("admin-error");
        if(pw===ADMIN_PASSWORD){
            document.getElementById("admin-login").style.display="none";
            document.getElementById("admin-panel").style.display="block";
            document.getElementById("json-output").textContent = JSON.stringify(users,null,2);
            errorElem.textContent="";
        } else {
            errorElem.textContent="Błędne hasło admina!";
        }
    }

    window.addAccount = function(){
        const idVal=parseInt(document.getElementById("new-id").value);
        const loginVal=document.getElementById("new-login").value.trim();
        const passwordVal=document.getElementById("new-password").value.trim();
        const saldoVal=parseInt(document.getElementById("new-saldo").value||0);

        if(!idVal || !loginVal || !passwordVal){ alert("ID, login i hasło są wymagane"); return; }
        if(users.some(u=>u.id===idVal)){ alert("ID już istnieje!"); return; }
        if(users.some(u=>u.login===loginVal)){ alert("Login już istnieje!"); return; }

        users.push({id:idVal, login:loginVal, haslo:passwordVal, saldo:saldoVal});
        document.getElementById("json-output").textContent=JSON.stringify(users,null,2);

        const panel = document.getElementById("admin-panel"); panel.classList.add("flash-green");
        setTimeout(()=>panel.classList.remove("flash-green"),300);

        document.getElementById("new-id").value="";
        document.getElementById("new-login").value="";
        document.getElementById("new-password").value="";
        document.getElementById("new-saldo").value="0";
    }

    window.removeLastAccount = function(){
        if(users.length===0){ alert("Brak kont do usunięcia!"); return; }
        const removed = users.pop();
        alert(`Usunięto konto: ${removed.login} (ID: ${removed.id})`);
        document.getElementById("json-output").textContent = JSON.stringify(users,null,2);

        const panel=document.getElementById("admin-panel"); panel.classList.add("flash-red");
        setTimeout(()=>panel.classList.remove("flash-red"),300);
    }

});
