"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { fmtCurrency } from "@/lib/util/score";

const SERIES = [
  { week: "Apr 1-3", paid: 240, pending: 0 },
  { week: "Apr 4-10", paid: 1600, pending: 0 },
  { week: "Apr 11-17", paid: 1600, pending: 0 },
  { week: "Apr 18-24", paid: 0, pending: 1746 },
];

const CONTRACTS = [
  {
    id: "ct-celsius",
    brand: "Celsius",
    title: "Celsius x College Ambassadors - Spring '26",
    status: "active",
    paid: 1620,
    pending: 0,
  },
  {
    id: "ct-bucked",
    brand: "Bucked Up",
    title: "Bucked Up - Fraternity Social Chair Pack",
    status: "active",
    paid: 1620,
    pending: 0,
  },
  {
    id: "ct-bloom",
    brand: "Bloom Nutrition",
    title: "Bloom × Creatine Gummies - Morning Stack",
    status: "pending payment",
    paid: 0,
    pending: 1740,
  },
  {
    id: "ct-mercor",
    brand: "Mercor",
    title: "Mercor - Campus Ambassadors",
    status: "draft",
    paid: 0,
    pending: 0,
  },
];

type PaymentStatus = "Pending" | "Received";

interface Payment {
  payoutDate: string;
  type: string;
  description: string;
  status: PaymentStatus;
  hours: string;
  earned: number;
}

const PAYMENTS: Payment[] = [
  {
    payoutDate: "Apr 29, 2026",
    type: "Contracts (Apr 18 - Apr 24)",
    description: "SWE",
    status: "Pending",
    hours: "3.64",
    earned: 145.70,
  },
  {
    payoutDate: "Apr 29, 2026",
    type: "Contracts (Apr 18 - Apr 24)",
    description: "SWE",
    status: "Pending",
    hours: "40.00",
    earned: 1600.14,
  },
  {
    payoutDate: "Apr 22, 2026",
    type: "Contracts (Apr 11 - Apr 17)",
    description: "SWE",
    status: "Received",
    hours: "40.00",
    earned: 1600.02,
  },
  {
    payoutDate: "Apr 15, 2026",
    type: "Contracts (Apr 4 - Apr 10)",
    description: "SWE",
    status: "Received",
    hours: "40.00",
    earned: 1600.04,
  },
  {
    payoutDate: "Apr 9, 2026",
    type: "Incentive",
    description: "SWE",
    status: "Received",
    hours: "-",
    earned: 201.00,
  },
  {
    payoutDate: "Apr 9, 2026",
    type: "Contracts (Mar 28 - Apr 3)",
    description: "SWE",
    status: "Received",
    hours: "40.00",
    earned: 1600.03,
  },
  {
    payoutDate: "Apr 1, 2026",
    type: "Contracts (Mar 21 - Mar 27)",
    description: "SWE",
    status: "Received",
    hours: "17.11",
    earned: 684.66,
  },
  // Mercor creator earnings
  {
    payoutDate: "Apr 26, 2026",
    type: "Creator post (Bucked Up)",
    description: '"Average quant" TikTok',
    status: "Received",
    hours: "-",
    earned: 850.00,
  },
  {
    payoutDate: "Apr 19, 2026",
    type: "Creator post (Celsius)",
    description: '"Gym-day check-in" TikTok',
    status: "Received",
    hours: "-",
    earned: 920.00,
  },
  {
    payoutDate: "Apr 12, 2026",
    type: "Creator referral (Ishan Dave)",
    description: "Mercor SWE",
    status: "Received",
    hours: "-",
    earned: 400.00,
  },
];

export default function EarningsPage() {
  const [contractFilter, setContractFilter] = useState("All contracts");
  const [typeFilter, setTypeFilter] = useState("All types");

  const total_to_date = 7431.59;

  const range_total = useMemo(
    () => SERIES.reduce((acc, s) => acc + s.paid + s.pending, 0),
    [],
  );

  return (
    <div>
      {/* Header */}
      <h1 className="h-display text-[28px]">Earnings</h1>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Your total earnings to date are{" "}
        <span className="font-semibold text-[var(--fg)]">
          {fmtCurrency(total_to_date)}
        </span>
        .
      </p>
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        <span className="text-[var(--fg-muted)]">Stripe payments -</span>
        <span className="pill pill-success">Connected</span>
      </div>

      {/* Promo card */}
      <section
        data-test-id="earnings-promo"
        className="mt-8 rounded-[14px] border border-[var(--accent-soft)] bg-[var(--bg-promo)] p-5"
      >
        <div className="text-[14px] font-medium">
          Unlock more earnings with Mercor Intros
        </div>
        <p className="mt-1 max-w-[680px] text-[12px] text-[var(--fg-muted)]">
          You decide who to introduce and what gets sent. Mercor handles the
          invite, so you don&apos;t need to reach out personally.
        </p>
        <Link
          href="/referrals"
          className="btn-primary mt-3 inline-flex items-center gap-2"
        >
          Explore LinkedIn Connections
        </Link>
      </section>

      {/* Earnings over time chart */}
      <section
        data-test-id="earnings-chart"
        className="mt-10 rounded-[14px] border border-[var(--border)] p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              Earnings over time
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
              Billing Date : Apr 1 - Apr 26, 2026
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[var(--fg-muted)]">
              Earnings total
            </div>
            <div className="text-[20px] font-semibold tracking-tight">
              {fmtCurrency(range_total)}
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="mt-4 flex items-center gap-2">
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[12px]"
          >
            <option>All contracts</option>
            {CONTRACTS.map((c) => (
              <option key={c.id}>{c.brand}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[12px]"
          >
            <option>All types</option>
            <option>Per-post</option>
            <option>Campaign</option>
          </select>
        </div>

        <div className="mt-5 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SERIES} barSize={64}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tickCount={5}
                domain={[0, 2000]}
                tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
                tickFormatter={(v: number) =>
                  v === 0 ? "$0" : v >= 1000 ? `$${v / 1000}K` : `$${v}`
                }
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value) =>
                  value === "paid" ? "Paid earnings" : "Pending earnings"
                }
              />
              <Bar
                dataKey="paid"
                name="paid"
                fill="var(--accent-bar-paid)"
                stackId="a"
              />
              <Bar
                dataKey="pending"
                name="pending"
                fill="var(--accent-bar-pending)"
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 text-right text-[11px] text-[var(--fg-muted)]">
          Data refreshes every hour.
        </div>
      </section>

      {/* Contracts section */}
      <section className="mt-10">
        <h2 className="text-[15px] font-semibold tracking-tight">Contracts</h2>
        <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--border)]">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Brand</th>
                <th>Status</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {CONTRACTS.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.title}</td>
                  <td>{c.brand}</td>
                  <td>
                    <span
                      className={`pill text-[11px] ${
                        c.status === "active"
                          ? "pill-success"
                          : c.status === "pending payment"
                            ? "pill-warning"
                            : ""
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="text-right">{fmtCurrency(c.paid)}</td>
                  <td className="text-right">{fmtCurrency(c.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payments table */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight">Payments</h2>
          <button
            data-test-id="earnings-download-report"
            className="btn-primary text-[12px]"
          >
            Download Payment Report
          </button>
        </div>
        <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--border)]">
          <table
            data-test-id="earnings-payments-table"
            className="dt-table"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Payout date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-right">Hours</th>
                <th className="text-right">Earned</th>
              </tr>
            </thead>
            <tbody>
              {PAYMENTS.map((p, i) => (
                <tr
                  key={i}
                  data-test-id={`earnings-payment-row-${i}`}
                  style={{ height: 38 }}
                >
                  <td className="whitespace-nowrap text-[12px] text-[var(--fg-muted)]">
                    {p.payoutDate}
                  </td>
                  <td className="text-[12px]">{p.type}</td>
                  <td className="text-[12px] text-[var(--fg-muted)]">
                    {p.description}
                  </td>
                  <td>
                    <span
                      className={`pill text-[11px] ${
                        p.status === "Pending" ? "pill-warning" : "pill-success"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="text-right tabular-nums text-[12px]">
                    {p.hours}
                  </td>
                  <td className="text-right tabular-nums text-[12px] font-medium">
                    {fmtCurrency(p.earned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
