(function(window, document) {
	var checker     = null;
	var correct     = null;
	var description = null;
	var image       = null;
	var next        = null; 
	var showAnswer  = null;

	var imageIndex   = 0;
	var trueAnswers  = ['threat', 'no_threat'];
	var descriptions = ['Plastic can cause death or injury when accidentally eaten by aquatic wildlife, such us fish, reptiles, seabirds, and mammals. Also plastic is not bio-degradable, meaning it stays long in the environment and releases harmful chemical compounds in the water',
						'A canoe does not pollute the canal because it does not need petrol or coal as fuel. Consequently, it does not release any toxic chemicals into the water. It is under human control, and it will be removed from the canal by the end of use.'];

	var tips = {
		SELECT_RADIO: "Choose the option that best represents the object",
		SHOW_ANSWER:  "After choosing, click \"Show answer\" to see the correct answer",
		CHOOSE_NEXT:  "Finally, click the arrow on the right to continue"
	}

	var getUserAnswer = function() {
		var userAnswer = false;
		var radios = document.getElementsByName('answer');
		for (var idx = 0; idx < radios.length; ++idx) {
			if (radios[idx].checked) {
				userAnswer = radios[idx].value;
				break;
			}
		}
		return userAnswer;
	};

	var showCorrect = function() {
		var userAnswer = getUserAnswer();
		var trueAnswer = trueAnswers[imageIndex];

		if (userAnswer === trueAnswer) {
			correct.textContent = 'Correct!';
		} else {
			correct.textContent = 'Incorrect!';
		}

		checker.classList.add(trueAnswer);
		checker.classList.add('active');
	};

	var hideCorrect = function() {
		correct.textContent = '';
		checker.className = '';
		description.classList.remove('active');
		helper.classList.remove('active');
	};

	var uncheckRadio = function() {
		var radios = document.getElementsByName('answer');
		for (var idx = 0; idx < radios.length; ++idx) {
			radios[idx].checked = false;
		}
	};

	var setupNextImage = function() {
		next.removeEventListener('click', setupNextImage);
		imageIndex += 1;
		hideCorrect();
		uncheckRadio();
		if (2 === imageIndex) {
			window.location.assign('pre_platform');
		} else {
			image.src = 'images/practice2.png';
			helper.textContent = tips.SELECT_RADIO;
			clickhere.style.display = "none";
			next.style.display = "none";
			for (var i = 0; i < radios.length; i++) {
				radios[i].addEventListener('click', radioClickedCallback);
			}
			showAnswer.addEventListener('click', showAnswerCallback);
		}
	};

	var radioClickedCallback = function() {
		helper.textContent = tips.SHOW_ANSWER;
		for (var i = 0; i < radios.length; i++) {
			radios[i].removeEventListener('click', radioClickedCallback);
		}
	}

	var showAnswerCallback = function(event) {
		showAnswer.removeEventListener('click', showAnswerCallback);
		helper.textContent = tips.CHOOSE_NEXT;
		clickhere.style.display = "block";
		next.style.display = "block";
		showCorrect();
		description.textContent = descriptions[imageIndex];
		description.classList.add('active');
		helper.classList.add('active');
		
		next.addEventListener('click', setupNextImage);
	};

	window.addEventListener('DOMContentLoaded', function(event) {
		checker     = document.getElementById('checker');
		correct     = document.getElementById('correctAnswer');
		description = document.getElementById('description');
		image       = document.getElementById('image');
		next        = document.getElementById('next');
		showAnswer  = document.getElementById('showAnswer');
		helper      = document.getElementById('helper');
		radios      = document.getElementsByClassName('radio');
		clickhere   = document.getElementById('clickhere');

    var radios = document.getElementsByClassName('radio_label');

    radios[0].addEventListener('click', function(event) {
      checker.className = '';
      checker.classList.add('threat');
      checker.classList.add('active');
    });
    radios[1].addEventListener('click', function(event) {
      checker.className = '';
      checker.classList.add('dontknow');
      checker.classList.add('active');
    });
    radios[2].addEventListener('click', function(event) {
      checker.className = '';
      checker.classList.add('no_threat');
      checker.classList.add('active');
    });
    
		if (helper)
			helper.textContent = tips.SELECT_RADIO;

		for (var i = 0; i < radios.length; i++) {
			radios[i].addEventListener('click', radioClickedCallback);
		}

		if (null !== showAnswer) {
			showAnswer.addEventListener('click', showAnswerCallback);
		}

		if (null === next) {
			next = document.getElementById('next2');
			next.addEventListener('click', function(event) {
				window.location.assign('platform');
			});
		}
	});
})(window, document);
