'use client';

import Link from 'next/link';
import { useWalletStore } from '@/store/wallet';
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton';

export default function LandingPage() {
  const { isConnected } = useWalletStore();

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-green-900 sm:text-5xl">
          Trade farm goods safely, even with strangers
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">
          Amana holds the buyer&apos;s money in a secure vault until the goods
          arrive. No more sending first and hoping. No more chasing payments.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          {isConnected ? (
            <Link
              href="/trades"
              className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
            >
              Go to my trades
            </Link>
          ) : (
            <WalletConnectButton />
          )}
          <Link
            href="/trades/new"
            className="rounded-lg border border-green-700 px-6 py-3 font-semibold text-green-800 hover:bg-green-50"
          >
            Start a trade
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center text-3xl font-bold text-green-900">
          How it works
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-700">
          A trade moves through five simple steps. The money is only released
          when both sides agree the goods arrived as promised.
        </p>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              step: '1',
              title: 'Buyer pays in',
              body: 'The buyer pays in their local money. It is instantly converted to cNGN — a digital naira that always holds its value — and locked in a secure vault.',
            },
            {
              step: '2',
              title: 'Funds are locked',
              body: 'The vault holds the money safely. Both sides agree on a loss-ratio: the split if goods are lost or damaged on the road (for example 50/50 or 70/30).',
            },
            {
              step: '3',
              title: 'Seller dispatches',
              body: 'The seller sends the goods and records the driver, phone number, and vehicle so everyone knows what is on the way.',
            },
            {
              step: '4',
              title: 'Delivery is confirmed',
              body: 'The buyer confirms the goods arrived with a short video. If something is wrong, the buyer and driver record the damage instead.',
            },
            {
              step: '5',
              title: 'Money is released',
              body: 'On a good delivery the seller is paid in full. On a loss, the agreed loss-ratio decides how the money is split fairly.',
            },
          ].map(({ step, title, body }) => (
            <li
              key={step}
              className="rounded-xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 font-bold text-white">
                {step}
              </span>
              <h3 className="mt-4 font-semibold text-green-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-green-900">
              For farmers &amp; sellers
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>• Ship knowing the buyer&apos;s money is already locked in.</li>
              <li>• Get paid the moment delivery is confirmed.</li>
              <li>• If goods are lost, the agreed loss-ratio protects you too.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-green-900">
              For buyers
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>• Your money stays in the vault until goods arrive.</li>
              <li>• Pay in naira; value is held safely as cNGN.</li>
              <li>• A neutral mediator settles any dispute fairly.</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-xl bg-green-900 p-6 text-white">
          <h3 className="text-lg font-semibold">Plain-language glossary</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="font-semibold">Escrow</dt>
              <dd className="mt-1 text-sm text-green-100">
                A neutral vault that holds the buyer&apos;s money until both
                sides are happy.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Loss-ratio</dt>
              <dd className="mt-1 text-sm text-green-100">
                The agreed split of money if goods are lost or damaged on the
                road.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">cNGN</dt>
              <dd className="mt-1 text-sm text-green-100">
                A digital naira that keeps its value, so trade is not affected
                by price swings.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
