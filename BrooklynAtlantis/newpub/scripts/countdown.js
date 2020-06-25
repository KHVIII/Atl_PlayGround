(function(window, document) {
	var NUM_IMAGES = 31;

  var checker        = null;
	var countdown      = null;
	var image          = null;
	var seqIdx         = 0;
  var radio_threat   = null;
  var radio_nothreat = null;
  var radio_dontknow = null;
  var startTime      = null;
  var lastClick      = null;

  var userTimes = [];

	// array of image names
	var imageNames = [];
	for(var i = 0; i < NUM_IMAGES; i++) {
		imageNames[i] = 'images/Image' + (i + 1) + '.png'
	}

	// sequence
	var seq = [];
	for(var i = 0; i < NUM_IMAGES; i++) {
		seq.push(i);
	}

	// shuffle
	function dinerShuffle(arr) {
		var tmp = -1;
		var shuffleIdx = -1;
		var len = arr.length;
		for (var idx = 0; idx < len; ++idx) {
			shuffleIdx = Math.floor(Math.random() * len);
			tmp = arr[shuffleIdx];
			arr[shuffleIdx] = arr[idx];
			arr[idx] = tmp;
		}
		return arr;
	};

	var shuffledSeq = dinerShuffle(seq);

	// get user answer
	var userAnswers = [];
	var getUserAnswer = function() {
		var userAnswer = null;
		var radios = document.getElementsByName('answer');
		for (var idx = 0; idx < radios.length; ++idx) {
			if (radios[idx].checked) {
				userAnswer = radios[idx].value;
				break;
			}
		}
		return userAnswer;
	};

	// uncheck radio
	var uncheckRadio = function() {
    checker.className = '';
		var radios = document.getElementsByName('answer');
		for (var idx = 0; idx < radios.length; ++idx) {
			radios[idx].checked = false;
		}
	};

	var setupNextImage = function() {
		uncheckRadio();
		countdown.textContent = '5';
  	  	progress.style.width =
  	  	percentage.innerHTML =
  	  	percentage.style.marginLeft = Math.round(count*100 / NUM_IMAGES) + "%";
  	  	startTime  = Date.now();
  	  	lastClick  = startTime;
		// For some reason this was causing a freeze so had to be reduced from 
		// 1s to 0.5s
  	  	window.setTimeout(countdownCallback, 500);
	};

	// download file
	function post(path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
      if(params.hasOwnProperty(key)) {
        var hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "hidden");
        hiddenField.setAttribute("name", key);
        hiddenField.setAttribute("value", params[key]);
        form.appendChild(hiddenField);
      }
    }
    document.body.appendChild(form);
    form.submit();
  };
  
	var count = 0;

	// count down 
	var countdownCallback = function() {
		image.removeEventListener('load', setupNextImage);
		var current = parseInt(countdown.textContent);
		countdown.textContent = '' + (current - 1);
		
		if (current > 1) {
			// keep counting down
			window.setTimeout(countdownCallback, 1000);
		} else {
		  	if (lastClick != startTime) {
		    	userTimes.push(lastClick - startTime);
		  	}
		  	else {
		    	userTimes.push(null);
		  	}
			userAnswers.push(getUserAnswer());
			if (seqIdx < NUM_IMAGES - 1) {
				// execute when timer expires
		    	count += 1;
		    	image.src = imageNames[shuffledSeq[++seqIdx]];
		   		image.addEventListener('load', setupNextImage);
				//window.setTimeout(setupNextImage);
				
			} else {
				finish();
			}
		}
	};
	
    var finish = function() {
    	post('/platform', {
        sequence: JSON.stringify(shuffledSeq),
        answers:  JSON.stringify(userAnswers),
        times:    JSON.stringify(userTimes)
      });
    }

	window.addEventListener('DOMContentLoaded', function(event) {
		countdown = document.getElementById('countdown');
    	checker   = document.getElementById('checker');
    	var radios = document.getElementsByClassName('radio_label');
	
    radios[0].addEventListener('click', function(event) {
      lastClick = Date.now();
      checker.className = '';
      checker.classList.add('threat');
      checker.classList.add('active');
    });
    radios[1].addEventListener('click', function(event) {
      lastClick = Date.now();
      checker.className = '';
      checker.classList.add('dontknow');
      checker.classList.add('active');
    });
    radios[2].addEventListener('click', function(event) {
      lastClick = Date.now();
      checker.className = '';
      checker.classList.add('no_threat');
      checker.classList.add('active');
    });

		image     = document.createElement('img');
		image.setAttribute('id', 'image');

    image.style.width  = '100%';
    image.style.height = '100%';
    progress  = document.getElementById("progress");
    percentage= document.getElementById('percentage');

		document.getElementById('image-wrapper').appendChild(image);

    image.src = imageNames[shuffledSeq[seqIdx]];
    image.addEventListener('load', setupNextImage);
	});
})(window, document);
