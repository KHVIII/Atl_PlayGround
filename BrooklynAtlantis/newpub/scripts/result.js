(function(window, document) {
	window.addEventListener('DOMContentLoaded', function(event) {
		next = document.getElementById('next');
		score = document.getElementById('score');

		next.addEventListener('click', function(event) {
			window.location.assign('survey.html');
		});

		score.innerHTML = window.location.search.substring(1).split('=')[1] + "%";
	});

})(window, document);