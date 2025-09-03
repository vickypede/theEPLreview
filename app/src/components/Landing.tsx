"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Article } from '@/types';
import Link from 'next/link';

type UiArticle = Article & { sourceName?: string; source?: string };

export default function Landing() {
  return (
    <div className="layer-1 min-h-screen">
      {/* Latest News Section */}
      <section className="section-bg py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-8">Latest News</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* News cards would go here */}
            <div className="card-bg rounded-2xl p-6 border border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">Latest Premier League Updates</h3>
              <p className="text-secondary">Stay up to date with the latest news from the Premier League</p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorials & Analysis Section */}
      <section className="layer-3 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-8">Editorials & Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Editorial cards would go here */}
            <div className="card-bg rounded-2xl p-6 border border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">Match Analysis</h3>
              <p className="text-secondary">In-depth analysis of Premier League matches</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mailbox Section */}
      <section className="section-bg py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-8">Mailbox</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mailbox cards would go here */}
            <div className="card-bg rounded-2xl p-6 border border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">Fan Letters</h3>
              <p className="text-secondary">Read letters from Premier League fans</p>
            </div>
          </div>
        </div>
      </section>

      {/* Match Reports Section */}
      <section className="layer-3 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-8">Match Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Match report cards would go here */}
            <div className="card-bg rounded-2xl p-6 border border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">Weekend Roundup</h3>
              <p className="text-secondary">Comprehensive coverage of weekend matches</p>
            </div>
          </div>
        </div>
      </section>

      {/* Big Match Review Section */}
      <section className="section-bg py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-8">Big Match Review</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Big match review cards would go here */}
            <div className="card-bg rounded-2xl p-6 border border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">Top Clashes</h3>
              <p className="text-secondary">Analysis of the biggest Premier League matches</p>
            </div>
          </div>
        </div>
      </section>

      {/* Site Products Section */}
      <section className="layer-3 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-8">Site Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Product cards would go here */}
            <div className="card-bg rounded-2xl p-6 border border-primary">
              <h3 className="text-xl font-semibold text-primary mb-2">Premium Content</h3>
              <p className="text-secondary">Exclusive Premier League content and analysis</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
