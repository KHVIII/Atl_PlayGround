(function(window,document) {
  window.addEventListener('DOMContentLoaded', function(event) {
    button = document.getElementById("accept");
    button.addEventListener("click", function(event) {
      window.location.replace("login.html")
    });
  });
})(window,document);