# Shorter <title> tags for search results (Google cuts titles at about 60 characters / 580px).
# Only the <title> and og:title use these; the page's own heading (H1) stays as written.
# The " | DocAura" suffix is added by build.py only when it still fits in 60 characters.
TITLES = {
    '': 'DocAura: Free PDF, Photo, Resume & Exam Form Tools Online',
    'cover-letter': 'Free Cover Letter Builder — Matches Your Resume (PDF)',
    'resume-examples/administrative-assistant': 'Administrative Assistant Resume Example (2026)',
    'resume-templates/ats-friendly': 'Free ATS-Friendly Resume Templates (PDF, No Sign-up)',
    'edit-pdf': 'Edit PDF Online Free — Add Text, Highlight & Images',
    'guides/resume-with-no-experience': 'How to Write a Resume With No Experience (Freshers)',
    'ist-to-pst': 'IST to PST Converter — India Time to Pacific Time',
    'resume-templates/fresher': 'Resume Format for Freshers — Free Templates (PDF)',
    'guides/scan-documents-with-phone': 'How to Scan Documents With Your Phone Into One PDF',
    'jpg-to-webp': 'JPG to WEBP Converter — Smaller Images, Free',
    'resize-signature-to-50kb': 'Resize Signature to 50KB or Below — Free Online',
    'days-between-dates': 'Days Between Dates Calculator — Days, Weeks & Workdays',
    'emi-calculator': 'EMI Calculator — Home, Car & Personal Loan EMI',
    'gratuity-calculator': 'Gratuity Calculator 2026 (India) — How Much Will I Get?',
    'reverse-gst-calculator': 'Reverse GST Calculator — Price Before GST from Total',
    'guides/pdf-to-word-tips': 'How to Convert PDF to Word (and Keep the Layout)',
    'guides/reduce-pdf-size': 'How to Reduce PDF Size for Forms, Email & Uploads',
    'salary-calculator': 'CTC to In-Hand Salary Calculator 2026 (India)',
    'bank-statement-pdf-password-remover': 'Remove Password from Bank Statement PDF — Free',
    'hi': 'DocAura हिंदी — फ़्री फ़ोटो, PDF और रिज़्यूमे टूल्स',
    'hi/typing-test': 'हिंदी टाइपिंग टेस्ट — SSC, CHSL, कोर्ट (फ़्री)',
    'home-loan-emi-calculator': 'Home Loan EMI Calculator — EMI, Interest & Schedule',
    'unit-converter': 'Unit Converter — Length, Weight, Area, Speed & More',
    'wifi-qr-code-generator': 'WiFi QR Code Generator — Share WiFi With a QR Code',
    'character-counter': 'Character Counter — With and Without Spaces (Free)',
    'guides/heic-to-jpg-iphone': "HEIC vs JPG: Why Your iPhone Photo Won't Upload",
    'image-to-text': 'Image to Text — Free OCR (English & Hindi)',
    'lumpsum-calculator': 'Lumpsum Calculator — Mutual Fund One-Time Returns',
    'personal-loan-emi-calculator': 'Personal Loan EMI Calculator — EMI & Total Interest',
    'resume-builder': 'Free Resume Builder — No Sign-up, No Watermark',
    'time-zone-converter': 'Time Zone Converter — IST to EST, PST, GMT & More',
    'guides/how-to-write-a-cover-letter': 'How to Write a Cover Letter That Gets Read',
    'guides/resize-photo-to-50kb': 'How to Resize a Photo to 20KB, 50KB or 100KB',
    'guides/resume-action-verbs': '120 Resume Action Words (With Examples)',
    'hindi-image-to-text': 'Hindi Image to Text — Hindi OCR Online Free',
    'password-generator': 'Strong Password Generator — Random & Secure (Free)',
    'png-to-jpg': 'PNG to JPG Converter — Online, Free, Many at Once',
    'age-calculator': 'Age Calculator — Exact Age on Any Date (for Exams)',
    'signature-resize': 'Signature Resize 10KB to 20KB — Free for Exam Forms',
    'fd-calculator': 'FD Calculator — Fixed Deposit Maturity & Interest',
    'rd-calculator': 'RD Calculator — Recurring Deposit Maturity Amount',
    'sip-calculator': 'SIP Calculator — Mutual Fund SIP Returns with Step-up',
    'white-background-photo': 'Make Photo Background White — Passport & Exam Photos',
    'hi/resume-builder': 'फ़्री रिज़्यूमे बिल्डर — बिना लॉगिन, बिना वॉटरमार्क',
    'photo-signature-joiner': 'Photo and Signature Joiner — One Image, Free',
    'word-counter': 'Word Counter — Words, Characters & Reading Time',
    'image-converter': 'Image Converter — PNG, JPG, WEBP & HEIC (Free)',
    'remove-background': 'Remove Background from Photo — Free & Private',
    'guides/passport-photo-size-by-country': 'Passport Photo Size by Country (2026): USA, UK, India',
    'hindi-typing-test': 'Hindi Typing Test — Mangal / Inscript (SSC, CPCT)',
    'ssc-typing-test': 'SSC Typing Test — CHSL & CGL Skill Test Practice',
    'hi/signature-resize': 'सिग्नेचर 10KB से 20KB करें — फ़्री (SSC, IBPS, SBI)',
    'compound-interest-calculator': 'Compound Interest Calculator — With Monthly Additions',
    'unlock-pdf': 'Unlock PDF — Remove PDF Password Free (No Upload)',
    'upi-qr-code-generator': 'UPI QR Code Generator — Free Payment QR for Shops',
    'gst-calculator': 'GST Calculator India — Add or Remove GST, CGST & SGST',
    'mortgage-calculator': 'Mortgage Calculator — Monthly Payment & Amortization',
    'qr-code-generator': 'Free QR Code Generator — UPI, Link, WiFi (No Expiry)',
    'percentage-calculator': 'Percentage Calculator — Marks %, Increase & Decrease',
    'photo-with-name-and-date': 'Add Name and Date Below Photo — UPSC, SSC, NEET',
    'typing-test': 'Typing Test in Hindi & English — SSC, CHSL, Court',
    'hi/age-calculator': 'आयु कैलकुलेटर — किसी भी तारीख़ पर सही उम्र',
    'guides/bank-exam-photo-signature-size': 'IBPS, SBI & Bank Exam Photo and Signature Size 2026',
    'hi/photo-signature-joiner': 'फ़ोटो और सिग्नेचर जोड़ें — एक इमेज में (फ़्री)',
    'guides/ssc-photo-signature-size': 'SSC Photo and Signature Size 2026 (CGL, CHSL, MTS)',
}


def short_desc(d, limit=158):
    """Keep meta descriptions within what Google shows (~155-160 characters), cutting at a natural break."""
    if len(d) <= limit:
        return d
    cut = d[:limit]
    for sep in ('. ', '! ', '? ', '। '):
        i = cut.rfind(sep)
        if i >= 90:
            return cut[:i + 1]
    for sep in (', ', ' — ', ' – ', '; ', ': '):
        i = cut.rfind(sep)
        if i >= 110:
            return cut[:i].rstrip(',;:') + '.'
    return cut[:cut.rfind(' ')].rstrip(',;:&—–- ') + '…'
