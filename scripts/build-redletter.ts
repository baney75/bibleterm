/**
 * Build red-letter verse index
 * Red-letter = words spoken by Jesus (and God the Father in specific contexts)
 */

import { writeFileSync } from 'fs';

interface RedLetterData {
  [key: string]: true;
}

const redLetter: RedLetterData = {};

function addVerse(book: string, chapter: number, verse: number) {
  const key = `${book}:${chapter}:${verse}`;
  redLetter[key] = true;
}

function addRange(book: string, chapter: number, startVerse: number, endVerse: number) {
  for (let v = startVerse; v <= endVerse; v++) {
    addVerse(book, chapter, v);
  }
}

function addChapter(book: string, chapter: number, verseCount: number) {
  addRange(book, chapter, 1, verseCount);
}

// ===== MATTHEW - Jesus' Words =====

// Sermon on the Mount (Matthew 5-7)
addRange('MAT', 5, 3, 48);    // Beatitudes and teaching
addRange('MAT', 6, 1, 34);    // Lord's Prayer, treasures, worry
addRange('MAT', 7, 1, 29);    // Judging, golden rule, narrow gate

// Other major teachings
addRange('MAT', 11, 4, 30);   // John's question, woes, rest
addRange('MAT', 12, 11, 12);  // Healing on Sabbath
addRange('MAT', 12, 25, 37);  // Strong man, blasphemy, fruit
addRange('MAT', 12, 39, 45);  // Sign of Jonah
addRange('MAT', 13, 3, 9);    // Parable of sower (part 1)
addRange('MAT', 13, 11, 23);  // Why parables, explanation
addRange('MAT', 13, 24, 30);  // Wheat and tares (part 1)
addRange('MAT', 13, 37, 52);  // Wheat and tares explained, more parables
addRange('MAT', 15, 3, 20);   // Traditions, what defiles
addRange('MAT', 16, 2, 4);    // Sign of Jonah
addRange('MAT', 16, 6, 12);   // Yeast of Pharisees
addRange('MAT', 16, 13, 28);  // Peter's confession, passion prediction
addRange('MAT', 17, 9, 27);   // Transfiguration, healing
addRange('MAT', 18, 3, 35);   // Greatest, lost sheep, unmerciful servant
addRange('MAT', 19, 4, 30);   // Divorce, children, rich young man
addRange('MAT', 20, 1, 16);   // Vineyard workers
addRange('MAT', 20, 18, 28);  // Cup of suffering, ransom
addRange('MAT', 21, 2, 27);   // Fig tree, authority questioned
addRange('MAT', 21, 31, 32);  // Tax collectors and prostitutes
addRange('MAT', 21, 42, 44);  // Rejected stone
addRange('MAT', 22, 1, 14);   // Wedding banquet
addRange('MAT', 22, 18, 46);  // Taxes, resurrection, greatest command
addRange('MAT', 23, 1, 39);   // Seven woes
addRange('MAT', 24, 2, 51);   // Olivet Discourse
addRange('MAT', 25, 1, 46);   // Ten virgins, talents, sheep and goats
addRange('MAT', 26, 2, 46);   // Last Supper, Gethsemane
addRange('MAT', 27, 11, 26);  // Before Pilate
addRange('MAT', 28, 5, 20);   // Resurrection

// Early ministry selections
addRange('MAT', 3, 15, 15);   // Fulfilling righteousness (to John)
addRange('MAT', 4, 4, 10);    // Temptations
addRange('MAT', 4, 17, 22);   // First teaching
addRange('MAT', 5, 1, 2);     // Sermon opening
addRange('MAT', 8, 3, 4);     // Healing leper
addRange('MAT', 8, 7, 13);    // Centurion's servant
addRange('MAT', 8, 20, 22);   // Foxes have holes
addRange('MAT', 8, 26, 32);   // Calming storm, demons
addRange('MAT', 9, 2, 9);     // Forgiving sins, call of Matthew
addRange('MAT', 9, 12, 17);   // New wine
addRange('MAT', 9, 22, 30);   // Hemorrhage, healing
addRange('MAT', 9, 37, 38);   // Harvest
addRange('MAT', 10, 5, 42);   // Mission instructions
addRange('MAT', 11, 7, 30);   // John's question, woes, rest
addRange('MAT', 12, 11, 12);  // Sabbath
addRange('MAT', 12, 25, 37);  // Strong man
addRange('MAT', 12, 39, 45);  // Sign of Jonah
addRange('MAT', 13, 3, 9);    // Sower
addRange('MAT', 13, 11, 23);  // Parables explained
addRange('MAT', 13, 24, 30);  // Wheat and tares
addRange('MAT', 13, 37, 52);  // Parables explained

// ===== MARK - Jesus' Words =====

// Major teaching blocks
addRange('MRK', 1, 15, 20);   // First teaching, call of disciples
addRange('MRK', 1, 25, 44);   // Healing, cleansing
addRange('MRK', 2, 5, 27);    // Forgiving sins, Sabbath, fasting
addRange('MRK', 3, 3, 5);     // Sabbath healing
addRange('MRK', 3, 23, 30);   // Strong man
addRange('MRK', 3, 33, 35);   // True family
addRange('MRK', 4, 3, 25);    // Parables
addRange('MRK', 4, 39, 41);   // Calming storm
addRange('MRK', 5, 8, 43);    // Healing legion, Jairus' daughter
addRange('MRK', 6, 4, 11);    // Rejection, sending out
addRange('MRK', 6, 31, 44);   // Feeding 5000
addRange('MRK', 6, 50, 52);   // Walking on water
addRange('MRK', 7, 6, 23);    // Traditions, what defiles
addRange('MRK', 7, 27, 37);   // Syrophoenician woman, healing
addRange('MRK', 8, 2, 26);    // Feeding 4000, sign, blind man
addRange('MRK', 8, 34, 38);   // Taking up cross
addRange('MRK', 9, 1, 29);    // Transfiguration, healing, teaching
addRange('MRK', 9, 31, 50);   // Passion prediction, teaching
addRange('MRK', 10, 3, 45);   // Divorce, children, rich, serving
addRange('MRK', 10, 52, 52);  // Bartimaeus
addRange('MRK', 11, 2, 6);    // Triumphal entry
addRange('MRK', 11, 14, 14);  // Fig tree
addRange('MRK', 11, 17, 25);  // Temple, authority, prayer
addRange('MRK', 12, 1, 27);   // Wicked tenants, taxes, resurrection
addRange('MRK', 12, 29, 44);  // Greatest command, widow's mite
addRange('MRK', 13, 2, 37);   // Olivet Discourse
addRange('MRK', 14, 6, 42);   // Anointing, Last Supper, Gethsemane
addRange('MRK', 14, 48, 62);  // Arrest, trial
addRange('MRK', 15, 2, 5);    // Before Pilate
addRange('MRK', 15, 34, 34);  // My God why
addRange('MRK', 16, 6, 18);   // Resurrection

// ===== LUKE - Jesus' Words =====

// Birth narratives
addRange('LUK', 1, 30, 37);   // Gabriel to Mary
addRange('LUK', 2, 49, 49);   // In the temple

// Early ministry
addRange('LUK', 3, 8, 14);    // John's teaching (pre-Jesus ministry)
addRange('LUK', 4, 4, 12);    // Temptations
addRange('LUK', 4, 17, 27);   // Nazareth synagogue
addRange('LUK', 4, 35, 41);   // Healing
addRange('LUK', 5, 4, 32);    // Calling disciples, healing, fasting
addRange('LUK', 6, 3, 10);    // Sabbath, calling apostles
addRange('LUK', 6, 20, 49);   // Sermon on the Plain

// Middle ministry
addRange('LUK', 7, 9, 50);    // Centurion, raising widow's son, anointing
addRange('LUK', 8, 8, 25);    // Parables, calming storm
addRange('LUK', 8, 39, 56);   // Legion, healing
addRange('LUK', 9, 3, 27);    // Sending out, feeding 5000, confession, transfiguration
addRange('LUK', 10, 2, 37);   // Sending 72, good Samaritan
addRange('LUK', 10, 38, 42);  // Mary and Martha
addRange('LUK', 11, 2, 54);   // Lord's Prayer, teaching
addRange('LUK', 12, 1, 59);   // Leaven, fear not, riches, watchfulness
addRange('LUK', 13, 3, 35);   // Repent, healing, narrow door, lament
addRange('LUK', 14, 3, 35);   // Sabbath, humility, banquet, counting cost
addRange('LUK', 15, 3, 32);   // Lost sheep, coin, son
addRange('LUK', 16, 1, 18);   // Shrewd manager, law and prophets
addRange('LUK', 16, 25, 31);  // Rich man and Lazarus
addRange('LUK', 17, 3, 10);   // Sin, faith, unworthy servants
addRange('LUK', 17, 20, 37);  // Kingdom, days of Son of Man
addRange('LUK', 18, 1, 30);   // Persistent widow, Pharisee and tax collector, children, rich ruler
addRange('LUK', 18, 38, 42);  // Blind beggar
addRange('LUK', 19, 5, 10);   // Zacchaeus
addRange('LUK', 19, 12, 27);  // Minas
addRange('LUK', 19, 31, 46);  // Colt, temple cleansing

// Passion and resurrection
addRange('LUK', 20, 3, 47);   // Authority, parable, taxes, resurrection, David's son, widow
addRange('LUK', 21, 3, 36);   // Olivet Discourse
addRange('LUK', 22, 8, 69);   // Last Supper, arrest, trials
addRange('LUK', 23, 3, 31);   // Before Pilate, crucifixion
addRange('LUK', 23, 43, 43);  // Paradise
addRange('LUK', 23, 46, 46);  // Into your hands
addRange('LUK', 24, 17, 52);  // Resurrection appearances

// ===== JOHN - Jesus' Words =====

// Prologue and early ministry
addRange('JHN', 1, 38, 51);   // Calling disciples

// John 3 - Nicodemus (EXCEPT 16-21 which is theological exposition by John)
addRange('JHN', 3, 3, 15);    // Jesus to Nicodemus
// 3:16-21 is JOHN'S commentary, not Jesus' words - intentionally excluded
addRange('JHN', 3, 22, 36);   // John the Baptist's testimony about Jesus

// Samaritan woman and following events
addRange('JHN', 4, 7, 26);    // Samaritan woman
addRange('JHN', 4, 32, 38);   // My food
addRange('JHN', 4, 48, 53);   // Official's son

// Healing at Bethesda
addRange('JHN', 5, 6, 47);    // Bethesda healing, Son's authority

// Bread of Life discourse
addRange('JHN', 6, 5, 71);    // Feeding 5000, bread of life

// Feast of Tabernacles
addRange('JHN', 7, 6, 9);     // My time
addRange('JHN', 7, 16, 36);   // Teaching at festival
addRange('JHN', 7, 37, 38);   // Living water

// Woman caught in adultery
addRange('JHN', 8, 2, 12);    // Let him without sin
addRange('JHN', 8, 14, 59);   // I am the light, before Abraham

// Healing blind man
addRange('JHN', 9, 3, 5);     // Blind man
addRange('JHN', 9, 35, 41);   // Do you believe?

// Good Shepherd
addRange('JHN', 10, 1, 30);   // Good shepherd
addRange('JHN', 10, 32, 38);  // I and the Father are one

// Raising Lazarus
addRange('JHN', 11, 4, 57);   // Lazarus

// Final teachings
addRange('JHN', 12, 7, 8);    // Anointing
addRange('JHN', 12, 23, 50);  // Grain of wheat, light, unbelief

// Upper Room discourse
addRange('JHN', 13, 6, 38);   // Washing feet, betrayal
addRange('JHN', 14, 1, 31);   // Way truth life, Spirit
addRange('JHN', 15, 1, 27);   // Vine, world hates
addRange('JHN', 16, 1, 33);   // Spirit, sorrow to joy
addRange('JHN', 17, 1, 26);   // High priestly prayer

// Passion
addRange('JHN', 18, 4, 11);   // Garden, cup
addRange('JHN', 18, 20, 37);  // Before Annas, Pilate
addRange('JHN', 19, 11, 11);  // No authority
addRange('JHN', 19, 26, 27);  // Behold your mother
addRange('JHN', 19, 30, 30);  // It is finished

// Resurrection
addRange('JHN', 20, 15, 29);  // Mary, disciples, Thomas
addRange('JHN', 21, 5, 23);   // By the sea

// ===== ACTS - Post-resurrection appearances =====

// Jesus appears to disciples
addRange('ACT', 1, 4, 8);     // Promise of Spirit, ascension instructions
addRange('ACT', 9, 4, 6);     // To Saul on road to Damascus
addRange('ACT', 22, 7, 10);   // Saul's retelling
addRange('ACT', 26, 14, 18);  // Saul's retelling before Agrippa

// ===== REVELATION - Christ speaks =====

addVerse('REV', 1, 8);        // I am the Alpha and Omega
addRange('REV', 1, 11, 11);   // Write what you see
addRange('REV', 1, 17, 20);   // Do not be afraid
addRange('REV', 2, 1, 7);     // To Ephesus
addRange('REV', 2, 8, 11);    // To Smyrna
addRange('REV', 2, 12, 17);   // To Pergamum
addRange('REV', 2, 18, 29);   // To Thyatira
addRange('REV', 3, 1, 6);     // To Sardis
addRange('REV', 3, 7, 13);    // To Philadelphia
addRange('REV', 3, 14, 22);   // To Laodicea
addVerse('REV', 16, 15);      // Behold I come
addRange('REV', 21, 5, 8);    // New creation words
addVerse('REV', 22, 7);       // Behold I am coming soon
addRange('REV', 22, 12, 13);  // I am coming, Alpha and Omega
addVerse('REV', 22, 16);      // I Jesus
addVerse('REV', 22, 20);      // Yes I am coming soon

// ===== GOD THE FATHER'S AUDIBLE VOICE =====

// At Jesus' baptism
addVerse('MAT', 3, 17);       // This is my beloved Son
addVerse('MRK', 1, 11);       // You are my beloved Son
addVerse('LUK', 3, 22);       // You are my beloved Son

// At Transfiguration
addVerse('MAT', 17, 5);       // This is my beloved Son, listen to him
addVerse('MRK', 9, 7);        // This is my beloved Son, listen to him
addVerse('LUK', 9, 35);       // This is my Son, my Chosen One, listen to him

// Before Passion
addVerse('JHN', 12, 28);      // I have glorified it and will glorify it again

// Verify John 3:16-21 is NOT included
const forbiddenVerses = [
  'JHN:3:16', 'JHN:3:17', 'JHN:3:18', 'JHN:3:19', 'JHN:3:20', 'JHN:3:21'
];
for (const key of forbiddenVerses) {
  if (redLetter[key]) {
    console.error(`ERROR: ${key} should NOT be red-letter!`);
    delete redLetter[key];
  }
}

// Sort keys for clean output
const sortedKeys = Object.keys(redLetter).sort();
const sortedData: RedLetterData = {};
for (const key of sortedKeys) {
  sortedData[key] = true;
}

// Write output
const outputPath = './data/red-letter.json';
writeFileSync(outputPath, JSON.stringify(sortedData, null, 2));

console.log(`✓ Red-letter index built: ${Object.keys(sortedData).length} verses`);
console.log(`✓ Saved to: ${outputPath}`);
