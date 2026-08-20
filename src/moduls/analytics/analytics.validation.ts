import { t } from "elysia";

const periodEnum = t.Union([
  t.Literal("today"),
  t.Literal("week"),
  t.Literal("month"),
  t.Literal("year"),
  t.Literal("custom"),
], { error: "Period tidak valid (today/week/month/year/custom)" });

export const analyticsQueryValidation = {
  query: t.Object({
    period: t.Optional(periodEnum),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
  }),
};

export const topMenuQueryValidation = {
  query: t.Object({
    period: t.Optional(periodEnum),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    limit: t.Optional(t.String()),
  }),
};
