(function(window,document) {
    window.addEventListener('DOMContentLoaded', function(event) {
  
      var button = document.getElementById("continue");
      var hiddenp = document.getElementById("hiddenp");
      var player;
  
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  
      window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player(document.getElementById('YTplayer'), {
          height: '720',
          width: '1280',
          videoId: 'dQw4w9WgXcQ',
          events: {
            //'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
          }
        });
        function onPlayerStateChange(event) {
          if (event.data === 0) {
            button.style.display = "inline";
            hiddenp.style.display = "inline";
            button.addEventListener("click", function(event) {
              window.location.replace("login.html");
            });
          }
        }
      }
    });
  })(window,document);