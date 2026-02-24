/* ============================================
   Certificate Generator - Shared Module
   Used by quiz.html and dashboard.html
   ============================================ */

var CertificateGenerator = (function() {

  function generate(name, targetElementId) {
    var certArea = document.getElementById(targetElementId);
    if (!certArea) return;
    certArea.style.display = 'block';

    var canvas = document.createElement('canvas');
    var img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Draw name on certificate
      ctx.font = 'bold 216px Poppins, sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(name, canvas.width / 2, canvas.height * 0.52);

      // Draw date
      var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      ctx.font = '36px Inter, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(today, canvas.width / 2, canvas.height * 0.72);

      var dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      certArea.innerHTML =
        '<img src="' + dataUrl + '" alt="Certificate of Achievement">' +
        '<br><a download="AI_Foundations_Certificate.jpg" href="' + dataUrl + '" class="btn-primary" style="display:inline-block; margin-top:1rem;">&#128229; Download Certificate</a>';
    };

    img.onerror = function() {
      certArea.innerHTML = '<p style="color:var(--color-accent);">Certificate template could not be loaded. Your result has been saved.</p>';
    };

    img.src = 'images/certificate-template.jpg';
  }

  return {
    generate: generate
  };
})();
