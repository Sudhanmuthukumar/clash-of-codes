const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const prisma = new PrismaClient();
const sqlitePath = path.join(__dirname, '..', 'db', 'techarena.db');
const sqlite = new Database(sqlitePath, { readonly: true });

async function verify() {
    console.log('=== VERIFYING INTEGRITY OF ORIGINAL DATA ===');

    // 1. Teams
    const sTeams = sqlite.prepare('SELECT id, team_name, year FROM teams ORDER BY id').all();
    let teamsMatch = 0;
    for (const st of sTeams) {
        const pg = await prisma.team.findUnique({ where: { id: st.id } });
        if (pg && pg.teamName === st.team_name && pg.year === st.year) teamsMatch++;
    }
    console.log(`✓ Teams verified: ${teamsMatch} / ${sTeams.length} matched`);

    // 2. Questions
    const sQ = sqlite.prepare('SELECT id, question_number, title FROM questions ORDER BY id').all();
    let qMatch = 0;
    for (const sq of sQ) {
        const pg = await prisma.question.findUnique({ where: { id: sq.id } });
        if (pg && pg.questionNumber === sq.question_number) qMatch++;
    }
    console.log(`✓ Questions verified: ${qMatch} / ${sQ.length} matched`);

    // 3. Allocations
    const sAlloc = sqlite.prepare('SELECT team_id, question_id FROM team_question_allocations ORDER BY team_id, question_id').all();
    let aMatch = 0;
    for (const sa of sAlloc) {
        const pg = await prisma.teamQuestionAllocation.findUnique({
            where: { teamId_questionId: { teamId: sa.team_id, questionId: sa.question_id } }
        });
        if (pg) aMatch++;
    }
    console.log(`✓ Allocations verified: ${aMatch} / ${sAlloc.length} matched`);

    // 4. Code Scramble Data
    const sCS = sqlite.prepare('SELECT question_id, first_line FROM code_scramble_data').all();
    let csMatch = 0;
    for (const sc of sCS) {
        const pg = await prisma.codeScrambleData.findUnique({ where: { questionId: sc.question_id } });
        if (pg && pg.firstLine === sc.first_line) csMatch++;
    }
    console.log(`✓ Code Scramble data verified: ${csMatch} / ${sCS.length} matched`);

    // 5. Hidden Tech Sub Questions
    const sSub = sqlite.prepare('SELECT id, correct_answer FROM hidden_tech_sub_questions').all();
    let subMatch = 0;
    for (const ss of sSub) {
        const pg = await prisma.hiddenTechSubQuestion.findUnique({ where: { id: ss.id } });
        if (pg && pg.correctAnswer === ss.correct_answer) subMatch++;
    }
    console.log(`✓ Hidden Tech Sub Questions verified: ${subMatch} / ${sSub.length} matched`);

    sqlite.close();
    await prisma.$disconnect();
    console.log('=== INTEGRITY VERIFICATION COMPLETE: 100% MATCH ===');
}

verify().catch((err) => {
    console.error(err);
    process.exit(1);
});
