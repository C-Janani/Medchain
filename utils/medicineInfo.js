/* ==========================================================================
   medicineInfo.js - plain-language medicine information (English + Tamil).
   General patient information only. It never replaces the doctor's or
   pharmacist's instructions. Keys match the generic names in clinicalData.js.
   ========================================================================== */

const INFO = {
  paracetamol: {
    en: {
      purpose: "Brings down fever and relieves mild to moderate pain such as headache or body ache.",
      how: "Can be taken with or without food. Do not take more doses than prescribed in a day, and leave at least 4 to 6 hours between doses.",
      sideEffects: "Usually well tolerated. Rarely a skin rash. Too much can seriously damage the liver.",
      caution: "Do not take other medicines that also contain paracetamol. Many cold and flu products do.",
    },
    ta: {
      purpose: "காய்ச்சலைக் குறைக்கும். தலைவலி, உடல்வலி போன்ற லேசான முதல் மிதமான வலியைக் குறைக்கும்.",
      how: "உணவுடனோ உணவு இல்லாமலோ எடுத்துக் கொள்ளலாம். ஒரு நாளில் பரிந்துரைக்கப்பட்டதை விட அதிக முறை எடுக்க வேண்டாம். இரண்டு டோஸ்களுக்கு இடையே குறைந்தது 4 முதல் 6 மணி நேர இடைவெளி விடுங்கள்.",
      sideEffects: "பொதுவாக நன்றாகப் பொறுத்துக் கொள்ளப்படும். அரிதாகத் தோலில் தடிப்பு ஏற்படலாம். அதிக அளவு எடுத்தால் கல்லீரல் கடுமையாகப் பாதிக்கப்படும்.",
      caution: "பாராசிட்டமால் உள்ள வேறு மருந்துகளைச் சேர்த்து எடுக்க வேண்டாம். பல சளி, காய்ச்சல் மருந்துகளில் அது இருக்கும்.",
    },
  },
  ibuprofen: {
    en: {
      purpose: "Relieves pain and swelling and brings down fever.",
      how: "Take after food or with milk to protect your stomach.",
      sideEffects: "Stomach upset, heartburn or nausea. Rarely, bleeding in the stomach.",
      caution: "Tell your doctor if you have stomach ulcers, kidney problems or asthma, or if you are pregnant. Do not take it together with other pain killers such as diclofenac.",
    },
    ta: {
      purpose: "வலி மற்றும் வீக்கத்தைக் குறைக்கும். காய்ச்சலையும் குறைக்கும்.",
      how: "வயிற்றைப் பாதுகாக்க உணவுக்குப் பிறகு அல்லது பாலுடன் எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "வயிற்று உபாதை, நெஞ்செரிச்சல், குமட்டல் ஏற்படலாம். அரிதாக வயிற்றில் இரத்தக் கசிவு ஏற்படலாம்.",
      caution: "வயிற்றுப் புண், சிறுநீரகப் பிரச்சினை, ஆஸ்துமா இருந்தாலோ கர்ப்பமாக இருந்தாலோ மருத்துவரிடம் தெரிவியுங்கள். டைக்ளோஃபெனாக் போன்ற வேறு வலி மாத்திரைகளுடன் சேர்த்து எடுக்க வேண்டாம்.",
    },
  },
  diclofenac: {
    en: {
      purpose: "Relieves pain and swelling, for example in joint, muscle or back pain.",
      how: "Take after food to protect your stomach.",
      sideEffects: "Stomach upset, heartburn, nausea or dizziness. Rarely, bleeding in the stomach.",
      caution: "Do not take it together with other pain killers such as ibuprofen. Tell your doctor if you have heart, kidney or stomach problems.",
    },
    ta: {
      purpose: "மூட்டு, தசை, முதுகு வலி போன்றவற்றில் வலியையும் வீக்கத்தையும் குறைக்கும்.",
      how: "வயிற்றைப் பாதுகாக்க உணவுக்குப் பிறகு எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "வயிற்று உபாதை, நெஞ்செரிச்சல், குமட்டல், தலைச்சுற்றல் ஏற்படலாம். அரிதாக வயிற்றில் இரத்தக் கசிவு ஏற்படலாம்.",
      caution: "இப்யூபுரூஃபன் போன்ற வேறு வலி மாத்திரைகளுடன் சேர்த்து எடுக்க வேண்டாம். இதயம், சிறுநீரகம் அல்லது வயிற்றுப் பிரச்சினை இருந்தால் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  aspirin: {
    en: {
      purpose: "Relieves pain and fever. In low doses it thins the blood to help prevent heart attacks and strokes.",
      how: "Take after food.",
      sideEffects: "Stomach upset, easy bruising or bleeding.",
      caution: "Not for children under 16. Tell your doctor or dentist before any surgery or procedure.",
    },
    ta: {
      purpose: "வலி, காய்ச்சலைக் குறைக்கும். குறைந்த அளவில் இரத்தத்தை இளக்கி மாரடைப்பு, பக்கவாதம் வராமல் தடுக்க உதவும்.",
      how: "உணவுக்குப் பிறகு எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "வயிற்று உபாதை, எளிதில் சிராய்ப்பு அல்லது இரத்தப்போக்கு ஏற்படலாம்.",
      caution: "16 வயதுக்குட்பட்ட குழந்தைகளுக்குக் கொடுக்கக் கூடாது. அறுவை சிகிச்சை அல்லது பல் சிகிச்சைக்கு முன் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  amoxicillin: {
    en: {
      purpose: "An antibiotic that treats bacterial infections such as throat, ear, chest and urinary infections.",
      how: "Take at evenly spaced times. Finish the whole course even if you feel better.",
      sideEffects: "Loose stools, nausea or a mild rash.",
      caution: "Get urgent help if you have swelling of the face or lips, trouble breathing or a severe rash. These can be signs of an allergy.",
    },
    ta: {
      purpose: "தொண்டை, காது, நெஞ்சு, சிறுநீர்த் தொற்று போன்ற பாக்டீரியா தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "சம இடைவெளியில் எடுத்துக் கொள்ளுங்கள். உடல்நலம் சரியானாலும் முழு கோர்ஸையும் முடியுங்கள்.",
      sideEffects: "தளர்ந்த மலம், குமட்டல் அல்லது லேசான தோல் தடிப்பு ஏற்படலாம்.",
      caution: "முகம் அல்லது உதடு வீக்கம், மூச்சுவிடச் சிரமம் அல்லது கடுமையான தடிப்பு ஏற்பட்டால் உடனே மருத்துவ உதவி பெறுங்கள். இது ஒவ்வாமையின் அறிகுறி.",
    },
  },
  azithromycin: {
    en: {
      purpose: "An antibiotic for bacterial infections of the throat, chest, ear and skin.",
      how: "Take once a day at the same time, unless your doctor says otherwise. Finish the whole course.",
      sideEffects: "Nausea, loose stools or stomach pain.",
      caution: "Tell your doctor if you have a heart rhythm problem or take other regular medicines.",
    },
    ta: {
      purpose: "தொண்டை, நெஞ்சு, காது, தோல் பாக்டீரியா தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "மருத்துவர் வேறு சொல்லாவிட்டால் தினமும் ஒரே நேரத்தில் ஒருமுறை எடுத்துக் கொள்ளுங்கள். முழு கோர்ஸையும் முடியுங்கள்.",
      sideEffects: "குமட்டல், தளர்ந்த மலம் அல்லது வயிற்று வலி ஏற்படலாம்.",
      caution: "இதயத் துடிப்பு பிரச்சினை இருந்தாலோ வேறு மருந்துகளைத் தொடர்ந்து எடுத்தாலோ மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  clarithromycin: {
    en: {
      purpose: "An antibiotic for bacterial infections of the chest, throat and skin.",
      how: "Take at evenly spaced times and finish the whole course.",
      sideEffects: "Nausea, loose stools or a metallic taste in the mouth.",
      caution: "It interacts with many medicines, including some for cholesterol and blood thinners. Tell your doctor about everything you take.",
    },
    ta: {
      purpose: "நெஞ்சு, தொண்டை, தோல் பாக்டீரியா தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "சம இடைவெளியில் எடுத்து முழு கோர்ஸையும் முடியுங்கள்.",
      sideEffects: "குமட்டல், தளர்ந்த மலம் அல்லது வாயில் உலோகச் சுவை ஏற்படலாம்.",
      caution: "கொலஸ்ட்ரால் மருந்துகள், இரத்தம் இளக்கும் மருந்துகள் உட்பட பல மருந்துகளுடன் இது வினைபுரியும். நீங்கள் எடுக்கும் அனைத்து மருந்துகளையும் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  ciprofloxacin: {
    en: {
      purpose: "An antibiotic for urinary, stomach and some chest infections.",
      how: "Drink plenty of water. Do not take it within 2 hours of milk, antacids, iron or calcium tablets.",
      sideEffects: "Nausea, loose stools, dizziness or headache.",
      caution: "Stop and call your doctor if you get pain or swelling in a tendon, such as the back of the ankle. Avoid hard exercise during the course.",
    },
    ta: {
      purpose: "சிறுநீர், வயிறு மற்றும் சில நெஞ்சுத் தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "நிறைய தண்ணீர் குடியுங்கள். பால், அன்டாசிட், இரும்பு அல்லது கால்சியம் மாத்திரைகளுக்கு 2 மணி நேரத்திற்குள் இதை எடுக்க வேண்டாம்.",
      sideEffects: "குமட்டல், தளர்ந்த மலம், தலைச்சுற்றல் அல்லது தலைவலி ஏற்படலாம்.",
      caution: "கணுக்காலின் பின்புறம் போன்ற தசைநாணில் வலி அல்லது வீக்கம் ஏற்பட்டால் மருந்தை நிறுத்தி மருத்துவரிடம் தெரிவியுங்கள். கோர்ஸ் முடியும் வரை கடுமையான உடற்பயிற்சியைத் தவிருங்கள்.",
    },
  },
  doxycycline: {
    en: {
      purpose: "An antibiotic for chest, skin and several other infections.",
      how: "Swallow with a full glass of water and stay upright for 30 minutes. Keep 2 hours apart from milk, antacids and iron.",
      sideEffects: "Nausea, stomach upset, and skin that burns easily in the sun.",
      caution: "Avoid strong sunlight. Not for young children or during pregnancy unless your doctor decides it is needed.",
    },
    ta: {
      purpose: "நெஞ்சு, தோல் மற்றும் பல தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "ஒரு முழு டம்ளர் தண்ணீருடன் விழுங்கி, 30 நிமிடம் நிமிர்ந்து இருங்கள். பால், அன்டாசிட், இரும்பு மாத்திரைகளுடன் 2 மணி நேர இடைவெளி விடுங்கள்.",
      sideEffects: "குமட்டல், வயிற்று உபாதை, வெயிலில் தோல் எளிதில் எரிதல் ஏற்படலாம்.",
      caution: "கடும் வெயிலைத் தவிருங்கள். சிறு குழந்தைகளுக்கும் கர்ப்ப காலத்திலும் மருத்துவர் தேவை என்று முடிவு செய்தால் மட்டுமே பயன்படுத்த வேண்டும்.",
    },
  },
  metronidazole: {
    en: {
      purpose: "An antibiotic for certain stomach, dental and other infections.",
      how: "Take after food to reduce nausea. Finish the whole course.",
      sideEffects: "Metallic taste, nausea or a headache.",
      caution: "Do not drink alcohol during the course and for 2 days after it. It can make you very ill.",
    },
    ta: {
      purpose: "சில வயிறு, பல் மற்றும் பிற தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "குமட்டலைக் குறைக்க உணவுக்குப் பிறகு எடுத்துக் கொள்ளுங்கள். முழு கோர்ஸையும் முடியுங்கள்.",
      sideEffects: "வாயில் உலோகச் சுவை, குமட்டல் அல்லது தலைவலி ஏற்படலாம்.",
      caution: "கோர்ஸ் நடக்கும் போதும் அதன் பிறகு 2 நாட்களுக்கும் மது அருந்த வேண்டாம். கடுமையான உடல்நலக் குறைவு ஏற்படலாம்.",
    },
  },
  cefixime: {
    en: {
      purpose: "An antibiotic for throat, ear, urinary and some chest infections.",
      how: "Take at the same times each day and finish the whole course.",
      sideEffects: "Loose stools, stomach pain or nausea.",
      caution: "Tell your doctor if you have ever had an allergy to penicillin.",
    },
    ta: {
      purpose: "தொண்டை, காது, சிறுநீர் மற்றும் சில நெஞ்சுத் தொற்றுகளுக்கான நுண்ணுயிர் எதிர்ப்பி மருந்து.",
      how: "தினமும் ஒரே நேரங்களில் எடுத்து முழு கோர்ஸையும் முடியுங்கள்.",
      sideEffects: "தளர்ந்த மலம், வயிற்று வலி அல்லது குமட்டல் ஏற்படலாம்.",
      caution: "பென்சிலினால் ஒவ்வாமை ஏற்பட்டிருந்தால் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  metformin: {
    en: {
      purpose: "Lowers blood sugar in type 2 diabetes.",
      how: "Take with or just after meals to reduce stomach upset.",
      sideEffects: "Nausea, loose stools or a metallic taste, mostly in the first weeks.",
      caution: "Tell your doctor if you have vomiting, severe diarrhoea or cannot drink enough fluids, or before a scan with contrast dye.",
    },
    ta: {
      purpose: "வகை 2 நீரிழிவில் இரத்தச் சர்க்கரையைக் குறைக்கும்.",
      how: "வயிற்று உபாதையைக் குறைக்க உணவுடன் அல்லது உணவுக்குப் பிறகு உடனே எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "குமட்டல், தளர்ந்த மலம் அல்லது வாயில் உலோகச் சுவை ஏற்படலாம். பெரும்பாலும் முதல் சில வாரங்களில் மட்டும்.",
      caution: "வாந்தி, கடுமையான வயிற்றுப்போக்கு, போதுமான திரவம் குடிக்க முடியாத நிலை இருந்தாலோ, கான்ட்ராஸ்ட் சாயத்துடன் ஸ்கேன் செய்யும் முன்பும் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  glimepiride: {
    en: {
      purpose: "Lowers blood sugar in type 2 diabetes.",
      how: "Take with breakfast or your first main meal.",
      sideEffects: "Low blood sugar: shakiness, sweating, hunger or confusion.",
      caution: "Do not skip meals. Keep sugar or glucose with you, and take it if you feel the signs of low blood sugar.",
    },
    ta: {
      purpose: "வகை 2 நீரிழிவில் இரத்தச் சர்க்கரையைக் குறைக்கும்.",
      how: "காலை உணவுடன் அல்லது முதல் முக்கிய உணவுடன் எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "இரத்தச் சர்க்கரை குறைதல்: நடுக்கம், வியர்வை, பசி அல்லது குழப்பம் ஏற்படலாம்.",
      caution: "உணவைத் தவிர்க்காதீர்கள். சர்க்கரை அல்லது குளுக்கோஸைக் கையில் வைத்திருங்கள். சர்க்கரை குறைவின் அறிகுறிகள் தோன்றினால் உடனே எடுத்துக் கொள்ளுங்கள்.",
    },
  },
  atorvastatin: {
    en: {
      purpose: "Lowers cholesterol and helps protect the heart and blood vessels.",
      how: "Take at the same time every day, usually at night.",
      sideEffects: "Muscle aches or stomach upset.",
      caution: "Tell your doctor at once if you get unexplained severe muscle pain or weakness, or dark urine. Avoid large amounts of grapefruit juice.",
    },
    ta: {
      purpose: "கொலஸ்ட்ராலைக் குறைத்து இதயத்தையும் இரத்தக் குழாய்களையும் பாதுகாக்க உதவும்.",
      how: "தினமும் ஒரே நேரத்தில், பொதுவாக இரவில் எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "தசை வலி அல்லது வயிற்று உபாதை ஏற்படலாம்.",
      caution: "காரணம் தெரியாத கடுமையான தசை வலி, பலவீனம் அல்லது அடர் நிறச் சிறுநீர் ஏற்பட்டால் உடனே மருத்துவரிடம் தெரிவியுங்கள். அதிக அளவு திராட்சைப்பழச் சாறைத் தவிருங்கள்.",
    },
  },
  amlodipine: {
    en: {
      purpose: "Lowers high blood pressure and can prevent chest pain.",
      how: "Take once a day at the same time. Keep taking it even if you feel well.",
      sideEffects: "Swelling of the ankles, flushing or headache.",
      caution: "Do not stop suddenly without asking your doctor.",
    },
    ta: {
      purpose: "உயர் இரத்த அழுத்தத்தைக் குறைக்கும். நெஞ்சு வலி வராமல் தடுக்கவும் உதவும்.",
      how: "தினமும் ஒரே நேரத்தில் ஒருமுறை எடுத்துக் கொள்ளுங்கள். நன்றாக உணர்ந்தாலும் தொடர்ந்து எடுங்கள்.",
      sideEffects: "கணுக்கால் வீக்கம், முகம் சிவத்தல் அல்லது தலைவலி ஏற்படலாம்.",
      caution: "மருத்துவரிடம் கேட்காமல் திடீரென நிறுத்த வேண்டாம்.",
    },
  },
  losartan: {
    en: {
      purpose: "Lowers high blood pressure and protects the kidneys in some people with diabetes.",
      how: "Take once a day at the same time.",
      sideEffects: "Dizziness, especially when standing up quickly.",
      caution: "Not safe in pregnancy. Do not use potassium-based salt substitutes unless your doctor agrees.",
    },
    ta: {
      purpose: "உயர் இரத்த அழுத்தத்தைக் குறைக்கும். நீரிழிவு உள்ள சிலருக்குச் சிறுநீரகத்தைப் பாதுகாக்கும்.",
      how: "தினமும் ஒரே நேரத்தில் ஒருமுறை எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "தலைச்சுற்றல் ஏற்படலாம். குறிப்பாக விரைவாக எழுந்து நிற்கும் போது.",
      caution: "கர்ப்ப காலத்தில் பாதுகாப்பானது அல்ல. மருத்துவர் ஒப்புக் கொள்ளாமல் பொட்டாசியம் கலந்த உப்புப் பதிலிகளைப் பயன்படுத்த வேண்டாம்.",
    },
  },
  telmisartan: {
    en: {
      purpose: "Lowers high blood pressure.",
      how: "Take once a day at the same time.",
      sideEffects: "Dizziness or back pain.",
      caution: "Not safe in pregnancy. Do not stop suddenly without asking your doctor.",
    },
    ta: {
      purpose: "உயர் இரத்த அழுத்தத்தைக் குறைக்கும்.",
      how: "தினமும் ஒரே நேரத்தில் ஒருமுறை எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "தலைச்சுற்றல் அல்லது முதுகு வலி ஏற்படலாம்.",
      caution: "கர்ப்ப காலத்தில் பாதுகாப்பானது அல்ல. மருத்துவரிடம் கேட்காமல் திடீரென நிறுத்த வேண்டாம்.",
    },
  },
  atenolol: {
    en: {
      purpose: "Lowers blood pressure and slows the heart rate.",
      how: "Take once a day at the same time.",
      sideEffects: "Tiredness, cold hands and feet, or a slow pulse.",
      caution: "Do not stop suddenly. Tell your doctor if you have asthma or wheezing.",
    },
    ta: {
      purpose: "இரத்த அழுத்தத்தைக் குறைத்து இதயத் துடிப்பை மெதுவாக்கும்.",
      how: "தினமும் ஒரே நேரத்தில் ஒருமுறை எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "சோர்வு, கை கால் குளிர்தல் அல்லது நாடித்துடிப்பு குறைதல் ஏற்படலாம்.",
      caution: "திடீரென நிறுத்த வேண்டாம். ஆஸ்துமா அல்லது மூச்சிரைப்பு இருந்தால் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  metoprolol: {
    en: {
      purpose: "Lowers blood pressure, controls the heart rate and protects the heart.",
      how: "Take with or just after food, at the same time each day.",
      sideEffects: "Tiredness, dizziness or a slow pulse.",
      caution: "Do not stop suddenly. Tell your doctor if you have asthma or wheezing.",
    },
    ta: {
      purpose: "இரத்த அழுத்தத்தைக் குறைத்து, இதயத் துடிப்பைக் கட்டுப்படுத்தி, இதயத்தைப் பாதுகாக்கும்.",
      how: "தினமும் ஒரே நேரத்தில், உணவுடன் அல்லது உணவுக்குப் பிறகு எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "சோர்வு, தலைச்சுற்றல் அல்லது நாடித்துடிப்பு குறைதல் ஏற்படலாம்.",
      caution: "திடீரென நிறுத்த வேண்டாம். ஆஸ்துமா அல்லது மூச்சிரைப்பு இருந்தால் மருத்துவரிடம் தெரிவியுங்கள்.",
    },
  },
  warfarin: {
    en: {
      purpose: "A blood thinner that prevents harmful blood clots.",
      how: "Take at the same time every day. You will need regular blood tests (INR) to keep the dose right.",
      sideEffects: "Bleeding or bruising more easily than usual.",
      caution: "Report any bleeding, black stools or a bad fall at once. Tell every doctor and dentist you take it, and do not start any new medicine without asking.",
    },
    ta: {
      purpose: "தீங்கு விளைவிக்கும் இரத்த உறைவைத் தடுக்கும் இரத்தம் இளக்கும் மருந்து.",
      how: "தினமும் ஒரே நேரத்தில் எடுத்துக் கொள்ளுங்கள். அளவைச் சரியாக வைக்க வழக்கமான இரத்தப் பரிசோதனை (INR) தேவை.",
      sideEffects: "வழக்கத்தை விட எளிதில் இரத்தப்போக்கு அல்லது சிராய்ப்பு ஏற்படலாம்.",
      caution: "இரத்தப்போக்கு, கருப்பு நிற மலம் அல்லது கடுமையான விழுதல் ஏற்பட்டால் உடனே தெரிவியுங்கள். எல்லா மருத்துவர்களிடமும் பல் மருத்துவரிடமும் இதை எடுப்பதைச் சொல்லுங்கள். கேட்காமல் புதிய மருந்து எதையும் தொடங்க வேண்டாம்.",
    },
  },
  clopidogrel: {
    en: {
      purpose: "Prevents blood clots, for example after a heart attack, a stent or a stroke.",
      how: "Take once a day at the same time, with or without food.",
      sideEffects: "Bruising easily or nosebleeds.",
      caution: "Do not stop without your doctor's advice. Tell your doctor or dentist before any surgery.",
    },
    ta: {
      purpose: "மாரடைப்பு, ஸ்டென்ட் அல்லது பக்கவாதத்திற்குப் பிறகு இரத்தக் கட்டிகள் உருவாவதைத் தடுக்கும்.",
      how: "தினமும் ஒரே நேரத்தில், உணவுடனோ உணவு இல்லாமலோ எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "எளிதில் சிராய்ப்பு அல்லது மூக்கில் இரத்தம் வருதல் ஏற்படலாம்.",
      caution: "மருத்துவர் ஆலோசனை இல்லாமல் நிறுத்த வேண்டாம். அறுவை சிகிச்சைக்கு முன் மருத்துவரிடமோ பல் மருத்துவரிடமோ தெரிவியுங்கள்.",
    },
  },
  omeprazole: {
    en: {
      purpose: "Reduces stomach acid. Used for acidity, heartburn and stomach ulcers.",
      how: "Take 30 minutes before breakfast, on an empty stomach.",
      sideEffects: "Headache, loose stools or stomach pain.",
      caution: "If you need it for more than a few weeks, ask your doctor to review it.",
    },
    ta: {
      purpose: "வயிற்று அமிலத்தைக் குறைக்கும். அசிடிட்டி, நெஞ்செரிச்சல், வயிற்றுப் புண்ணுக்குப் பயன்படும்.",
      how: "காலை உணவுக்கு 30 நிமிடம் முன்பு, வெறும் வயிற்றில் எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "தலைவலி, தளர்ந்த மலம் அல்லது வயிற்று வலி ஏற்படலாம்.",
      caution: "சில வாரங்களுக்கு மேல் தேவைப்பட்டால் மருத்துவரிடம் மறுஆய்வு செய்யச் சொல்லுங்கள்.",
    },
  },
  pantoprazole: {
    en: {
      purpose: "Reduces stomach acid. Used for acidity, heartburn and stomach ulcers, and to protect the stomach.",
      how: "Take 30 minutes before breakfast, on an empty stomach.",
      sideEffects: "Headache, loose stools or stomach pain.",
      caution: "If you need it for more than a few weeks, ask your doctor to review it.",
    },
    ta: {
      purpose: "வயிற்று அமிலத்தைக் குறைக்கும். அசிடிட்டி, நெஞ்செரிச்சல், வயிற்றுப் புண்ணுக்கும், வயிற்றைப் பாதுகாக்கவும் பயன்படும்.",
      how: "காலை உணவுக்கு 30 நிமிடம் முன்பு, வெறும் வயிற்றில் எடுத்துக் கொள்ளுங்கள்.",
      sideEffects: "தலைவலி, தளர்ந்த மலம் அல்லது வயிற்று வலி ஏற்படலாம்.",
      caution: "சில வாரங்களுக்கு மேல் தேவைப்பட்டால் மருத்துவரிடம் மறுஆய்வு செய்யச் சொல்லுங்கள்.",
    },
  },
  cetirizine: {
    en: {
      purpose: "Relieves allergy symptoms such as sneezing, a runny nose, itching and watery eyes.",
      how: "Take once a day. It is best taken at night because it can cause sleepiness.",
      sideEffects: "Sleepiness, dry mouth or tiredness.",
      caution: "Do not drive or use machines if you feel sleepy. Avoid alcohol.",
    },
    ta: {
      purpose: "தும்மல், மூக்கொழுகல், அரிப்பு, கண்ணில் நீர் வடிதல் போன்ற ஒவ்வாமை அறிகுறிகளைக் குறைக்கும்.",
      how: "தினமும் ஒருமுறை எடுத்துக் கொள்ளுங்கள். தூக்கம் வரக்கூடும் என்பதால் இரவில் எடுப்பது நல்லது.",
      sideEffects: "தூக்கம், வாய் உலர்தல் அல்லது சோர்வு ஏற்படலாம்.",
      caution: "தூக்கமாக உணர்ந்தால் வாகனம் ஓட்டவோ இயந்திரங்களை இயக்கவோ வேண்டாம். மதுவைத் தவிருங்கள்.",
    },
  },
  salbutamol: {
    en: {
      purpose: "Opens the airways to ease wheezing, cough and shortness of breath in asthma.",
      how: "Use exactly as directed. Do not take extra doses to get quicker relief.",
      sideEffects: "Shaky hands, a fast heartbeat or headache.",
      caution: "Get urgent medical help if your breathing does not improve or gets worse.",
    },
    ta: {
      purpose: "ஆஸ்துமாவில் மூச்சிரைப்பு, இருமல், மூச்சுத் திணறலைக் குறைக்க சுவாசக் குழாய்களைத் திறக்கும்.",
      how: "சொன்னபடியே பயன்படுத்துங்கள். விரைவான நிவாரணத்திற்காக கூடுதல் டோஸ் எடுக்க வேண்டாம்.",
      sideEffects: "கை நடுக்கம், இதயத் துடிப்பு வேகமாதல் அல்லது தலைவலி ஏற்படலாம்.",
      caution: "மூச்சுவிடுதல் சரியாகாவிட்டாலோ மோசமானாலோ உடனே மருத்துவ உதவி பெறுங்கள்.",
    },
  },
  prednisolone: {
    en: {
      purpose: "A steroid that reduces inflammation and allergic reactions.",
      how: "Take with or after breakfast. Follow the dose schedule exactly.",
      sideEffects: "Increased appetite, mood changes, trouble sleeping or higher blood sugar.",
      caution: "If you have been taking it for more than a couple of weeks, do not stop suddenly. Ask your doctor how to reduce it.",
    },
    ta: {
      purpose: "வீக்கத்தையும் ஒவ்வாமை எதிர்வினைகளையும் குறைக்கும் ஸ்டீராய்டு மருந்து.",
      how: "காலை உணவுடன் அல்லது உணவுக்குப் பிறகு எடுத்துக் கொள்ளுங்கள். டோஸ் அட்டவணையை அப்படியே பின்பற்றுங்கள்.",
      sideEffects: "பசி அதிகரித்தல், மனநிலை மாற்றம், தூக்கமின்மை அல்லது இரத்தச் சர்க்கரை உயர்தல் ஏற்படலாம்.",
      caution: "இரண்டு வாரங்களுக்கு மேல் எடுத்திருந்தால் திடீரென நிறுத்த வேண்டாம். அளவைக் குறைப்பது எப்படி என்று மருத்துவரிடம் கேளுங்கள்.",
    },
  },
};

const GENERIC = {
  en: {
    purpose: "Your doctor prescribed this for your condition.",
    how: "Take it exactly as your doctor prescribed.",
    sideEffects: "Ask your pharmacist about the common side effects of this medicine.",
    caution: "Ask your pharmacist what to avoid while taking it, such as other medicines, food or alcohol.",
  },
  ta: {
    purpose: "உங்கள் உடல்நிலைக்காக மருத்துவர் இதைப் பரிந்துரைத்துள்ளார்.",
    how: "மருத்துவர் பரிந்துரைத்தபடியே எடுத்துக் கொள்ளுங்கள்.",
    sideEffects: "இந்த மருந்தின் பொதுவான பக்கவிளைவுகளைப் பற்றி மருந்தாளரிடம் கேளுங்கள்.",
    caution: "இதை எடுக்கும் போது வேறு மருந்துகள், உணவு, மது போன்றவற்றில் எதைத் தவிர்க்க வேண்டும் என்று மருந்தாளரிடம் கேளுங்கள்.",
  },
};

const LABELS = {
  en: {
    disclaimer: "This is general information. Follow your doctor's instructions, and ask your pharmacist if you are unsure.",
    aiNote: "Written by an AI assistant. Please confirm with your pharmacist.",
    asDirected: "As directed",
  },
  ta: {
    disclaimer: "இது பொதுவான தகவல் மட்டுமே. உங்கள் மருத்துவரின் அறிவுரையைப் பின்பற்றுங்கள். சந்தேகம் இருந்தால் மருந்தாளரிடம் கேளுங்கள்.",
    aiNote: "இது ஒரு AI உதவியாளரால் எழுதப்பட்டது. மருந்தாளரிடம் உறுதி செய்து கொள்ளுங்கள்.",
    asDirected: "மருத்துவர் சொன்னபடி",
  },
};

module.exports = { INFO, GENERIC, LABELS };
