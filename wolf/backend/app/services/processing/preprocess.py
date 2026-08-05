import re
from app.core.logging import logger

try:
    import spacy

    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        logger.info("spaCy model unavailable; using blank English pipeline fallback.")
        nlp = spacy.blank("en")
except Exception:
    spacy = None
    nlp = None
    logger.info("spaCy unavailable; using regex-based text cleaning fallback.")

def clean_text(text: str) -> str:
    """
    Preprocesses text using spaCy:
    - Tokenization (handled automatically by nlp())
    - Stopword removal
    - Lowercasing
    - Noise filtering (punctuation, URLs, spaces, non-alphanumeric)
    """
    if not text:
        return ""

    if nlp is None:
        tokens = re.findall(r"[A-Za-z0-9$\.]+", text.lower())
        return " ".join(token for token in tokens if len(token) > 1)

    doc = nlp(text)
    
    cleaned_tokens = []
    for token in doc:
        # Noise filtering: remove punctuation, spaces, URLs, emails
        if token.is_punct or token.is_space or token.like_url or token.like_email:
            continue
            
        # Stopword removal
        if token.is_stop:
            continue
            
        # Keep only alphanumeric tokens (useful for tickers and financial figures)
        if not token.is_alpha and not token.is_digit:
            continue
            
        # Lowercasing
        cleaned_tokens.append(token.lower_)
        
    return " ".join(cleaned_tokens)
