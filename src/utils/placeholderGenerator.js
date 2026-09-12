export function getHistoryPagesSVG() {
  const page1 = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="980" viewBox="0 0 700 980">
    <rect width="700" height="980" fill="#fcfcfc" rx="8"/>
    <!-- Realistic notebook ruling and double vertical margin lines matching Image 1 -->
    <line x1="75" y1="0" x2="75" y2="980" stroke="#4b5563" stroke-width="1.3"/>
    <line x1="79" y1="0" x2="79" y2="980" stroke="#4b5563" stroke-width="1.3"/>
    ${Array.from({ length: 37 }).map((_, i) => `<line x1="0" y1="${50 + i * 25}" x2="700" y2="${50 + i * 25}" stroke="#cbd5e1" stroke-width="0.9" opacity="0.75"/>`).join('')}

    <!-- Q.1 -->
    <text x="15" y="73" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.1.</text>
    <text x="88" y="73" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Write short notes on any two. (1) Indian National Congress (2) Swaraj</text>
    <text x="15" y="98" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="98" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(1) Indian National Congress : The Indian National Congress was established in 1885 at Bombay.</text>
    <text x="88" y="123" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">A. O. Hume played an important role in its formation. The main objective of the Congress was to</text>
    <text x="88" y="148" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">create a platform for educated Indians to express their political demands. In early years, Congress</text>
    <text x="88" y="173" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">followed a moderate approach and demanded reforms from British government.</text>
    
    <text x="88" y="198" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(2) Swaraj : Swaraj means self-rule. The demand for Swaraj became strong during the freedom</text>
    <text x="88" y="223" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">movement. Lokmanya Tilak gave the slogan "Swaraj is my birthright and I shall have it". The</text>
    <text x="88" y="248" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">demand for complete independence was later adopted by Congress in 1929.</text>

    <!-- Q.2 -->
    <text x="15" y="298" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.2.</text>
    <text x="88" y="298" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Explain the main features of the Non-Cooperation Movement.</text>
    <text x="15" y="323" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="323" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(1) Launched by Mahatma Gandhi in 1920.</text>
    <text x="88" y="348" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(2) It was a response to the Rowlatt Act and Jallianwala Bagh massacre.</text>
    <text x="88" y="373" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(3) People were asked to boycott foreign goods, government schools, law courts and titles.</text>
    <text x="88" y="398" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(4) It aimed to achieve Swaraj through non-violent means.</text>
    <text x="88" y="423" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(5) Movement was withdrawn in 1922 after Chauri Chaura incident.</text>

    <!-- Q.3 -->
    <text x="15" y="473" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.3.</text>
    <text x="88" y="473" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Write a note on the contribution of Dr. B. R. Ambedkar.</text>
    <text x="15" y="498" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="498" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">Dr. B. R. Ambedkar was a great social reformer, jurist and chairman of Drafting Committee</text>
    <text x="88" y="523" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">of Indian Constitution. He worked for rights of downtrodden and fought against untouchability.</text>
    <text x="88" y="548" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">He believed in education, equality and social justice. His contribution in framing Constitution</text>
    <text x="88" y="573" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">of India is invaluable.</text>
  </svg>`;

  const page2 = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1100" viewBox="0 0 700 1100">
    <rect width="700" height="1100" fill="#fcfcfc" rx="8"/>
    <!-- Realistic notebook ruling and double vertical margin lines matching Image 1 exactly -->
    <line x1="75" y1="0" x2="75" y2="1100" stroke="#4b5563" stroke-width="1.3"/>
    <line x1="79" y1="0" x2="79" y2="1100" stroke="#4b5563" stroke-width="1.3"/>
    ${Array.from({ length: 42 }).map((_, i) => `<line x1="0" y1="${50 + i * 25}" x2="700" y2="${50 + i * 25}" stroke="#cbd5e1" stroke-width="0.9" opacity="0.75"/>`).join('')}

    <!-- Q.4 -->
    <text x="15" y="73" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.4.</text>
    <text x="88" y="73" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">State any four causes of the French Revolution.</text>
    <text x="15" y="98" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="98" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(1) Social inequality.</text>
    <text x="88" y="123" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(2) Financial crisis</text>
    <text x="88" y="148" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(3) Influence of Enlightenment thinkers</text>
    <text x="88" y="173" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(4) Autocratic rule of Louis XVI.</text>

    <!-- Q.5 -->
    <text x="15" y="223" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.5.</text>
    <text x="88" y="223" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Write a short note on the United Nations.</text>
    <text x="15" y="248" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="248" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">The United Nations was established in 1945 after the Second World War. Its main objective</text>
    <text x="88" y="273" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">is to maintain international peace and security, develop friendly relations among nations</text>
    <text x="88" y="298" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">and promote social, economic and cultural co-operation. India is one of the founding members</text>
    <text x="88" y="323" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">of the United Nations.</text>

    <!-- Q.6 -->
    <text x="15" y="373" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.6.</text>
    <text x="88" y="373" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">What were the results of the First World War? (Any four)</text>
    <text x="15" y="398" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="398" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(1) Huge loss of life and property.</text>
    <text x="88" y="423" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(2) Growth of nationalistic feelings.</text>
    <text x="88" y="448" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(3) Collapse of old empires like German, Austrian and Ottoman.</text>
    <text x="88" y="473" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(4) Establishment of the League of Nations.</text>

    <!-- Q.7 -->
    <text x="15" y="523" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.7.</text>
    <text x="88" y="523" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Write a note on Mahatma Gandhi's Satyagraha movement.</text>
    <text x="15" y="548" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="548" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">Mahatma Gandhi started the Satyagraha movement in South Africa in 1906. It was based on</text>
    <text x="88" y="573" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">the principles of truth and non-violence. He used Satyagraha as a weapon against injustice.</text>
    <text x="88" y="598" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">The movement inspired Indians in their struggle for freedom, and later became an important</text>
    <text x="88" y="623" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">part of the Indian independence movement.</text>

    <!-- Q.8 -->
    <text x="15" y="673" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.8.</text>
    <text x="88" y="673" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Explain the importance of the Dandi March.</text>
    <text x="15" y="698" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="698" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">The Dandi March was started by Mahatma Gandhi on 12th March 1930 to protest against British</text>
    <text x="88" y="723" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">salt law. He along with followers marched from Sabarmati to Dandi (240 miles). By making salt,</text>
    <text x="88" y="748" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">Gandhi broke the law and showed ordinary people could also resist British rule. The march</text>
    <text x="88" y="773" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">brought the freedom struggle to the masses and received worldwide attention.</text>

    <!-- Q.9 -->
    <text x="15" y="823" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Q.9.</text>
    <text x="88" y="823" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827" text-decoration="underline">Write any four features of the Indian Constitution.</text>
    <text x="15" y="848" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="15" font-weight="bold" fill="#111827">Ans:</text>
    <text x="88" y="848" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(1) It provides a democratic form of government.</text>
    <text x="88" y="873" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(2) It guarantees fundamental rights to all citizens.</text>
    <text x="88" y="898" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(3) It ensures equality before law.</text>
    <text x="88" y="923" font-family="'Kalam', 'Caveat', 'Segoe Print', 'Architects Daughter', cursive" font-size="14.5" fill="#1f2937">(4) It establishes an independent judiciary.</text>
  </svg>`;

  return [
    `data:image/svg+xml;utf8,${encodeURIComponent(page1)}`,
    `data:image/svg+xml;utf8,${encodeURIComponent(page2)}`
  ];
}

export function getSciencePagesSVG() {
  const page1 = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="850" viewBox="0 0 700 850">
    <rect width="700" height="850" fill="#ffffff" rx="12"/>
    <line x1="80" y1="0" x2="80" y2="850" stroke="#f87171" stroke-width="2"/>
    <line x1="84" y1="0" x2="84" y2="850" stroke="#f87171" stroke-width="1"/>
    ${Array.from({ length: 28 }).map((_, i) => `<line x1="0" y1="${60 + i * 27}" x2="700" y2="${60 + i * 27}" stroke="#93c5fd" stroke-width="1" opacity="0.6"/>`).join('')}

    <!-- Q.1 -->
    <text x="15" y="80" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.1.</text>
    <text x="95" y="80" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Define the term 'Force' and write its SI unit.</text>
    <text x="15" y="107" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    <text x="95" y="107" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Force is a push or pull acting on a body which can change its state of rest or motion or its shape.</text>
    <text x="95" y="134" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">The SI unit of force is newton (N).</text>

    <!-- Q.2 -->
    <text x="15" y="188" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.2.</text>
    <text x="95" y="188" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">State Newton's first law of motion.</text>
    <text x="15" y="215" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    <text x="95" y="215" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Every body continues in its state of rest or uniform motion in a straight line unless acted upon</text>
    <text x="95" y="242" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">by an external unbalanced force.</text>

    <!-- Q.3 -->
    <text x="15" y="296" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.3.</text>
    <text x="95" y="296" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Derive an expression for the velocity of a freely falling body.</text>
    <text x="15" y="323" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    <text x="95" y="323" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Let, Initial velocity, u = 0 (freely falling)</text>
    <text x="95" y="350" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Acceleration due to gravity, a = g | Time of fall = t | Final velocity = v</text>
    <text x="95" y="377" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Using equation of motion: v = u + at => v = 0 + gt => v = gt.</text>
  </svg>`;

  const page2 = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900">
    <rect width="700" height="900" fill="#ffffff" rx="12"/>
    <line x1="80" y1="0" x2="80" y2="900" stroke="#f87171" stroke-width="2"/>
    <line x1="84" y1="0" x2="84" y2="900" stroke="#f87171" stroke-width="1"/>
    ${Array.from({ length: 30 }).map((_, i) => `<line x1="0" y1="${60 + i * 27}" x2="700" y2="${60 + i * 27}" stroke="#93c5fd" stroke-width="1" opacity="0.6"/>`).join('')}

    <!-- Q.4 -->
    <text x="15" y="80" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.4.</text>
    <text x="95" y="80" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Draw a neat labelled diagram of a concave mirror...</text>
    <text x="15" y="107" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    
    <!-- Concave mirror ray diagram vector drawing -->
    <path d="M480 120 Q440 220 480 320" stroke="#0f172a" stroke-width="3" fill="none"/>
    <line x1="120" y1="220" x2="560" y2="220" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="4 2"/>
    <line x1="200" y1="220" x2="200" y2="150" stroke="#2563eb" stroke-width="2.5"/> <!-- Object AB -->
    <text x="195" y="140" font-family="sans-serif" font-size="13" font-weight="bold" fill="#2563eb">A</text>
    <text x="195" y="238" font-family="sans-serif" font-size="13" font-weight="bold" fill="#2563eb">B</text>
    
    <circle cx="300" cy="220" r="3" fill="#0f172a"/>
    <text x="295" y="240" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">C</text>

    <circle cx="380" cy="220" r="3" fill="#0f172a"/>
    <text x="375" y="240" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">F</text>

    <line x1="330" y1="220" x2="330" y2="255" stroke="#dc2626" stroke-width="2"/> <!-- Image A'B' -->
    <text x="325" y="270" font-family="sans-serif" font-size="12" font-weight="bold" fill="#dc2626">A'</text>

    <text x="95" y="340" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Image is formed: 1) between F and C  2) real and inverted  3) diminished in size.</text>

    <!-- Q.5 -->
    <text x="15" y="394" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.5.</text>
    <text x="95" y="394" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">State the law of conservation of energy.</text>
    <text x="15" y="421" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    <text x="95" y="421" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Energy can neither be created nor destroyed, but it can be converted from one form to another.</text>
    <text x="95" y="448" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Therefore, the total energy of an isolated system remains constant.</text>

    <!-- Q.6 -->
    <text x="15" y="502" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.6.</text>
    <text x="95" y="502" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">A body of mass 5 kg is moving with velocity of 10 m/s. Find kinetic energy.</text>
    <text x="15" y="529" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    <text x="95" y="529" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Given: Mass, m = 5 kg | Velocity, v = 10 m/s | Kinetic energy = ?</text>
    <text x="95" y="556" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">Formula: KE = (1/2) * m * v² = (1/2) * 5 * (10)² = (1/2) * 5 * 100 = 250 J.</text>

    <!-- Q.7 -->
    <text x="15" y="610" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Q.7.</text>
    <text x="95" y="610" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="bold" fill="#0f172a">List any four uses of electric energy.</text>
    <text x="15" y="637" font-family="'Segoe UI', sans-serif" font-size="15" font-weight="bold" fill="#1e3a8a">Ans:</text>
    <text x="95" y="637" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">1) Lighting (bulbs, LED)  2) Heating (electric heater, iron)</text>
    <text x="95" y="664" font-family="'Comic Sans MS', cursive, sans-serif" font-size="14" fill="#1e40af">3) Running household appliances (fan, refrigerator, TV)  4) In industries (machinery, motors)</text>
  </svg>`;

  return [
    `data:image/svg+xml;utf8,${encodeURIComponent(page1)}`,
    `data:image/svg+xml;utf8,${encodeURIComponent(page2)}`
  ];
}

export function getAnswerSheetPlaceholder(name = 'Student', rollNo = 'CS101') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#ffffff" rx="16"/>
    <rect x="30" y="30" width="540" height="110" fill="#f8fafc" rx="12" stroke="#e2e8f0" stroke-width="2"/>
    <text x="50" y="65" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">ANSWER SHEET - EVALUATION COPY</text>
    <text x="50" y="95" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#2563eb">Student: ${name}</text>
    <text x="350" y="95" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#475569">Roll No: ${rollNo}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
