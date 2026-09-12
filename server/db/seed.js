const { prisma } = require('./database');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seed() {
    console.log('Seeding PostgreSQL database via Prisma...');

    const adminUserId = process.env.ADMIN_USER_ID || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'TechArena@2026';

    const existingAdmin = await prisma.admin.findUnique({
        where: { userId: adminUserId }
    });

    if (existingAdmin) {
        console.log('Admin account already exists in database. Ensuring default sections exist.');
        for (const sec of ['A', 'B', 'C']) {
            await prisma.section.upsert({
                where: { name: sec },
                update: { isActive: 1 },
                create: { name: sec, isActive: 1 }
            });
        }
        console.log('Seed check complete.');
        return;
    }

    // --- Admin ---
    const adminHash = bcrypt.hashSync(adminPassword, 12);
    await prisma.admin.create({
        data: {
            userId: adminUserId,
            passwordHash: adminHash
        }
    });
    console.log(`  Admin created (user_id: ${adminUserId}).`);

    // --- Sections ---
    for (const sec of ['A', 'B', 'C']) {
        await prisma.section.upsert({
            where: { name: sec },
            update: { isActive: 1 },
            create: { name: sec, isActive: 1 }
        });
    }
    console.log('  Default sections (A, B, C) created.');

    // --- Events ---
    const ev1 = await prisma.event.create({
        data: {
            name: 'Code Scramble',
            year: '2nd Year',
            description: 'Rearrange scrambled Python code blocks into the correct order.',
            timeLimitMinutes: 45,
            questionsPerTeam: 5,
            status: 'not_started'
        }
    });

    const ev2 = await prisma.event.create({
        data: {
            name: 'Hidden Tech',
            year: '3rd Year',
            description: 'Solve multi-domain technical puzzles to uncover the hidden password.',
            timeLimitMinutes: 60,
            questionsPerTeam: 5,
            status: 'not_started'
        }
    });
    console.log('  Events created (Code Scramble & Hidden Tech).');

    // --- Sample Teams ---
    const teamHash = bcrypt.hashSync('team123', 12);
    await prisma.team.createMany({
        data: [
            {
                year: '2nd Year',
                teamName: 'Team Alpha',
                member1Name: 'Alice Johnson',
                member1Section: 'A',
                participant1Name: 'Alice Johnson',
                participant1Batch: 'A',
                member2Name: 'Alex Smith',
                member2Section: 'A',
                participant2Name: 'Alex Smith',
                participant2Batch: 'A',
                email: 'alice@college.edu',
                passwordHash: teamHash,
                eventId: ev1.id,
                status: 'active'
            },
            {
                year: '2nd Year',
                teamName: 'Team Beta',
                member1Name: 'Bob Williams',
                member1Section: 'B',
                participant1Name: 'Bob Williams',
                participant1Batch: 'B',
                email: 'bob@college.edu',
                passwordHash: teamHash,
                eventId: ev1.id,
                status: 'active'
            },
            {
                year: '3rd Year',
                teamName: 'Team Gamma',
                member1Name: 'Charlie Brown',
                member1Section: 'A',
                participant1Name: 'Charlie Brown',
                participant1Batch: 'A',
                member2Name: 'Carol Davis',
                member2Section: 'B',
                participant2Name: 'Carol Davis',
                participant2Batch: 'B',
                email: 'charlie@college.edu',
                passwordHash: teamHash,
                eventId: ev2.id,
                status: 'active'
            },
            {
                year: '3rd Year',
                teamName: 'Team Delta',
                member1Name: 'Dave Wilson',
                member1Section: 'C',
                participant1Name: 'Dave Wilson',
                participant1Batch: 'C',
                email: 'dave@college.edu',
                passwordHash: teamHash,
                eventId: ev2.id,
                status: 'active'
            }
        ]
    });
    console.log('  Sample teams created (password: team123).');

    // --- Code Scramble Questions ---
    const csQuestions = [
        {
            title: 'Simple Addition',
            problem_description: 'Write a Python program that initializes two variables a and b with values 10 and 20 respectively, calculates their sum in a variable named total, and prints the result.',
            marks: 100,
            final_code: 'a = 10\nb = 20\ntotal = a + b\nprint(total)',
            shuffled_code: 'print(total)\ntotal = a + b\na = 10\nb = 20',
            hint: 'The first step is to define variables before using them.'
        },
        {
            title: 'List Sum',
            problem_description: 'Create a list of numbers from 1 to 5, initialize an accumulator total to 0, iterate through the list using a for loop to sum all numbers, and print the accumulated total.',
            marks: 100,
            final_code: 'numbers = [1, 2, 3, 4, 5]\ntotal = 0\nfor n in numbers:\n    total += n\nprint(total)',
            shuffled_code: 'print(total)\nfor n in numbers:\ntotal = 0\n    total += n\nnumbers = [1, 2, 3, 4, 5]',
            hint: 'You need to create the list before iterating over it.'
        },
        {
            title: 'Factorial Function',
            problem_description: 'Define a recursive function factorial(n) with base case n == 0 returning 1 and recursive step returning n * factorial(n - 1). Call factorial(5) and print the result.',
            marks: 100,
            final_code: 'def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)\nresult = factorial(5)\nprint(result)',
            shuffled_code: 'print(result)\nresult = factorial(5)\n    return n * factorial(n - 1)\n    if n == 0:\ndef factorial(n):\n        return 1',
            hint: 'A function must be defined before it can be called.'
        },
        {
            title: 'String Reverse',
            problem_description: 'Initialize a string variable text with "hello", reverse the string using Python slice notation text[::-1], store it in reversed_text, and print the reversed string.',
            marks: 100,
            final_code: 'text = "hello"\nreversed_text = text[::-1]\nprint(reversed_text)',
            shuffled_code: 'print(reversed_text)\ntext = "hello"\nreversed_text = text[::-1]',
            hint: 'Start by assigning the string to a variable.'
        },
        {
            title: 'Even Numbers Filter',
            problem_description: 'Generate numbers 1 through 10 using range, initialize an empty list evens, loop through numbers and append even numbers (n % 2 == 0), then print the evens list.',
            marks: 100,
            final_code: 'numbers = range(1, 11)\nevens = []\nfor n in numbers:\n    if n % 2 == 0:\n        evens.append(n)\nprint(evens)',
            shuffled_code: 'print(evens)\n    if n % 2 == 0:\nevens = []\nfor n in numbers:\n        evens.append(n)\nnumbers = range(1, 11)',
            hint: 'Create the range and empty list before the loop.'
        }
    ];

    for (let i = 0; i < csQuestions.length; i++) {
        const cs = csQuestions[i];
        const firstLine = cs.final_code.split('\n').find(l => l.trim() !== '') || '';
        await prisma.question.create({
            data: {
                eventId: ev1.id,
                questionNumber: i + 1,
                title: cs.title,
                marks: cs.marks,
                hint: cs.hint,
                hintPenalty: 5,
                displayOrder: i + 1,
                codeScrambleData: {
                    create: {
                        problemDescription: cs.problem_description,
                        finalCode: cs.final_code,
                        shuffledCode: cs.shuffled_code,
                        firstLine: firstLine,
                        firstLinePenalty: 1
                    }
                }
            }
        });
    }
    console.log(`  ${csQuestions.length} Code Scramble questions created with problem descriptions.`);

    console.log('Seeding complete!');
}

if (require.main === module) {
    seed()
        .then(() => prisma.$disconnect())
        .catch((e) => {
            console.error('Seed error:', e);
            prisma.$disconnect();
            process.exit(1);
        });
}

module.exports = { seed };
