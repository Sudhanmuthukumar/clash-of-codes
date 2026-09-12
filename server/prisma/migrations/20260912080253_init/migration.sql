-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "description" TEXT,
    "time_limit_minutes" INTEGER NOT NULL DEFAULT 45,
    "questions_per_team" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "start_time" TIMESTAMPTZ,
    "end_time" TIMESTAMPTZ,
    "pause_duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "pause_start_time" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "year" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "member_1_name" TEXT NOT NULL,
    "member_1_section" TEXT NOT NULL,
    "participant_1_name" TEXT,
    "participant_1_batch" TEXT,
    "member_2_name" TEXT,
    "member_2_section" TEXT,
    "participant_2_name" TEXT,
    "participant_2_batch" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "event_started_at" TIMESTAMPTZ,
    "event_submitted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "title" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 10,
    "hint" TEXT,
    "hint_penalty" INTEGER NOT NULL DEFAULT 0,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_scramble_data" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "problem_description" TEXT,
    "final_code" TEXT NOT NULL,
    "shuffled_code" TEXT NOT NULL,
    "first_line" TEXT NOT NULL,
    "first_line_penalty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "code_scramble_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_tech_questions" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "final_output" TEXT NOT NULL,
    "final_output_marks" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "hidden_tech_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_tech_sub_questions" (
    "id" SERIAL NOT NULL,
    "main_question_id" INTEGER NOT NULL,
    "sub_question_number" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "revealed_character" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 5,
    "hint" TEXT,
    "hint_penalty" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "hidden_tech_sub_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_question_allocations" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_question_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_scramble_attempts" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "line_order" TEXT NOT NULL,
    "first_line_correct" INTEGER NOT NULL DEFAULT 0,
    "first_line_penalty_applied" INTEGER NOT NULL DEFAULT 0,
    "swaps_count" INTEGER NOT NULL DEFAULT 0,
    "hints_count" INTEGER NOT NULL DEFAULT 0,
    "current_points" INTEGER NOT NULL DEFAULT 100,
    "is_submitted" INTEGER NOT NULL DEFAULT 0,
    "is_correct" INTEGER NOT NULL DEFAULT 0,
    "marks_awarded" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_scramble_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_tech_sub_attempts" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "sub_question_id" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "is_correct" INTEGER NOT NULL DEFAULT 0,
    "marks_awarded" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_tech_sub_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_tech_final_attempts" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "final_output" TEXT NOT NULL,
    "is_correct" INTEGER NOT NULL DEFAULT 0,
    "marks_awarded" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_tech_final_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hint_usage" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "sub_question_id" INTEGER,
    "penalty" INTEGER NOT NULL,
    "used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hint_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_history" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "question_id" INTEGER,
    "sub_question_id" INTEGER,
    "action" TEXT NOT NULL,
    "points_change" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" INTEGER,
    "details" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_name_key" ON "sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_team_name_key" ON "teams"("team_name");

-- CreateIndex
CREATE UNIQUE INDEX "code_scramble_data_question_id_key" ON "code_scramble_data"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_tech_questions_question_id_key" ON "hidden_tech_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_question_allocations_team_id_question_id_key" ON "team_question_allocations"("team_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "code_scramble_attempts_team_id_question_id_key" ON "code_scramble_attempts"("team_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_tech_sub_attempts_team_id_sub_question_id_key" ON "hidden_tech_sub_attempts"("team_id", "sub_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_tech_final_attempts_team_id_question_id_key" ON "hidden_tech_final_attempts"("team_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "hint_usage_team_id_question_id_sub_question_id_key" ON "hint_usage"("team_id", "question_id", "sub_question_id");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_scramble_data" ADD CONSTRAINT "code_scramble_data_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_tech_questions" ADD CONSTRAINT "hidden_tech_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_tech_sub_questions" ADD CONSTRAINT "hidden_tech_sub_questions_main_question_id_fkey" FOREIGN KEY ("main_question_id") REFERENCES "hidden_tech_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_question_allocations" ADD CONSTRAINT "team_question_allocations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_question_allocations" ADD CONSTRAINT "team_question_allocations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_scramble_attempts" ADD CONSTRAINT "code_scramble_attempts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_scramble_attempts" ADD CONSTRAINT "code_scramble_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_tech_sub_attempts" ADD CONSTRAINT "hidden_tech_sub_attempts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_tech_sub_attempts" ADD CONSTRAINT "hidden_tech_sub_attempts_sub_question_id_fkey" FOREIGN KEY ("sub_question_id") REFERENCES "hidden_tech_sub_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_tech_final_attempts" ADD CONSTRAINT "hidden_tech_final_attempts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_tech_final_attempts" ADD CONSTRAINT "hidden_tech_final_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_usage" ADD CONSTRAINT "hint_usage_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_usage" ADD CONSTRAINT "hint_usage_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hint_usage" ADD CONSTRAINT "hint_usage_sub_question_id_fkey" FOREIGN KEY ("sub_question_id") REFERENCES "hidden_tech_sub_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_sub_question_id_fkey" FOREIGN KEY ("sub_question_id") REFERENCES "hidden_tech_sub_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_teams_team_name_lower" ON "teams"(LOWER("team_name"));
