-- CHECK constraint escrito à mão: o Prisma Schema não expressa CHECK constraints,
-- então esta regra vive só aqui (paridade com life-os-model.sql).
-- HABIT.frequencyTarget = quantas vezes por período o hábito deve ocorrer, logo > 0.
ALTER TABLE "HABIT"
    ADD CONSTRAINT "habit_frequencyTarget_positive" CHECK ("frequencyTarget" > 0);
