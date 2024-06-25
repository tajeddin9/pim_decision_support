const readline = require('readline');
const fs = require('fs');

const rules = JSON.parse(fs.readFileSync('rules.json', 'utf8'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}
async function checkRules(patient) {
    console.log(`Prüfe Regeln für Patient: ${JSON.stringify(patient)}`);
    for (const rule of rules) {
        const condition = new Function('Patient', `return ${rule.condition};`);
        if (condition(patient) && !patient.lastRule || patient.lastRule !== rule.name) {
            patient.lastRule = rule.name; 
            const action = rule.action.split(' ');
            console.log(`Regel erfüllt: ${rule.name}, Aktion: ${rule.action}`);
            if (action[0] === 'goto') {
                const nextRuleName = rule.action.substring(5).trim().replace(/'/g, '');
                console.log(`Goto: ${nextRuleName}`);
                await executeRule(nextRuleName, patient);
                break;
            } else if (action[0] === 'Prozess.ende()') {
                console.log('ENDE des Prozesses.');
                return;
            } else if (action[0] === 'Batterie.wechseln()') {
                console.log('Wechsel der Batterie wird ausgeführt.');
                return;
            }
        }
    }
}

async function executeRule(ruleName, patient) {
    const rule = rules.find(r => r.name === ruleName);
    if (!rule) {
        console.log(`Keine Regel gefunden mit dem Namen: ${ruleName}`);
        return;
    }
    console.log(`Ausführung der Regel: ${ruleName}`); 
    switch (ruleName) {
        case "Therapieart Überprüfen":
            if (!patient.therapieArt) { 
                const therapyType = await askQuestion('Welche Therapie? (THS/Andere) ');
                patient.therapieArt = therapyType.toUpperCase();
                console.log(`Therapieart: ${patient.therapieArt}`);
            }
            await checkRules(patient);
            break;
        case "Letzte Kontrolle Überprüfen":
            const lastControl = await askQuestion('Letzte Kontrolle vor mehr als 3 Monaten? (ja/nein) ');
            patient.letzteKontrolle = lastControl.toLowerCase() === 'ja';
            console.log(`Letzte Kontrolle: ${patient.letzteKontrolle}`);
            await checkRules(patient);
            break;
        case "Schrittmacher Überprüfen":
            const schrittmacher = await askQuestion('Ist der Schrittmacher erschöpft? (ja/nein) ');
            patient.schrittmacherErschöpft = schrittmacher.toLowerCase() === 'ja';
            console.log(`Schrittmacher erschöpft: ${patient.schrittmacherErschöpft}`);
            await checkRules(patient);
            break;
        case "Batteriewechsel Überprüfen":
            console.log('Wechsel der Batterie');
            break;
        default:
            break;
    }
}

// Hauptfunktion, um den Prozess zu starten
(async function() {
    const aktuellPK = await askQuestion('Erhalten Sie aktuell eine PK-Therapie? (ja/nein) ');
    const patient = {
        erhältAktuellPKTherapie: aktuellPK.toLowerCase() === 'ja'
    };

    console.log(`Erhält aktuell PK-Therapie: ${patient.erhältAktuellPKTherapie}`);

    if (patient.erhältAktuellPKTherapie) {
        await executeRule('Therapieart Überprüfen', patient);
    } else {
        const pastPK = await askQuestion('Hatten Sie in der Vergangenheit bereits eine PK-Therapie? (ja/nein) ');
        patient.hatteFrüherePKTherapie = pastPK.toLowerCase() === 'ja';
        console.log(`Hatte frühere PK-Therapie: ${patient.hatteFrüherePKTherapie}`);
        await checkRules(patient);
    }

    rl.close();
})();




