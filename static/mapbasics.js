function isSpam(text) {
  // Check for random number spam
  if (/\d{10,}/.test(text)) {
    return true;
  }

  // Check for repeated characters
  if (/(.)\1\1/.test(text)) {
    return true;
  }

  // Basic keyword-based spam detection
  var spamKeywords = ['free', 'offer', 'winner', 'prize', 'click here', 'subscribe', 'buy now'];
  var regex = new RegExp('\\b(' + spamKeywords.join('|') + ')\\b', 'gi');
  if (regex.test(text)) {
    return true;
  }

  // Check for links
  if (/https?:\/\/|www\./i.test(text)) {
    return true;
  }

  return false;
}
