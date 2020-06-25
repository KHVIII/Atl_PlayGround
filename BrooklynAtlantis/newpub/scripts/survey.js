(function(window, document) {

  var download = function(data, filename, type) {
    var a    = document.createElement('a');
    var file = new Blob([data], {type: type});
      
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(file, filename);
    } else {
      var url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
       window.URL.revokeObject(url);
      }, 1);
    }
  };

  var getChecked = function(radios) {
    var len = radios.length
    for (var i = 0; i < len; ++i) {
      if (radios[i].checked)
        return i;
    }
    return null;
  }

	window.addEventListener('DOMContentLoaded', function(event) {
		var submit = document.getElementById('submit-button');

		submit.addEventListener('click', function(event) {
      a3=null;
      var results = {
        a1: getChecked(document.getElementsByName('interest'));
        a2: getChecked(document.getElementsByName('education'));
        a3: document.getElementById('zip').value;
      }
			//download([a1, a2, a3], 'survey-results.txt', 'text/plain');
      post('/survey', results)
      //instead of downloading, send form info to server
      window.location.replace("index.html");
		});
	});
})(window, document);