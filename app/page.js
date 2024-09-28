'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { supabase } from '../libs/supabaseClient'; // Import your Supabase client
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Next.js routing

// Header Component
const Header = () => {
  console.log("Header component rendered");
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="text-l font-bold text-blue-700">PriceMyPlace.ie</div>
          <div className="hidden md:flex space-x-4">
            <a href="#" className="text-gray-600 hover:text-blue-700">Home</a>
            <a href="#" className="text-gray-600 hover:text-blue-700">About</a>
          </div>
        </div>
      </nav>
    </header>
  );
};

// PropertyValuationHero Component
const PropertyValuationHero = () => {
  const [address, setAddress] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (address.trim() === '') {
      alert('Please enter an Irish address.');
      return;
    }

    try {
      // Fetch geolocation data
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (response.ok && data.lat && data.lng) {
        // Use URLSearchParams to construct the query string
        const params = new URLSearchParams({
          lat: data.lat.toString(),
          lng: data.lng.toString(),
          address: data.address,
        });

        // Route to the result page with the query parameters
        router.push(`/result?${params.toString()}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error fetching geolocation data:', error.message);
      alert('Error fetching geolocation data.');
    }
  };

  return (
    <div
      className="relative bg-cover bg-center text-gray-800 py-24"
      style={{
        backgroundImage: "url('/pexels-photo-dublin.jpeg')",
      }}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="container mx-auto px-4 relative z-10 text-center">
        <h1 className="text-3xl font-bold mb-2 text-white">How Much Is My Home Worth?</h1>
        <p className="text-m mb-6 text-gray-200">
          Enter your address to get an instant estimate.
        </p>
        <form onSubmit={handleSubmit} className="flex justify-center flex-col md:flex-row items-center">
          <input
            type="text"
            placeholder="Enter your address"
            className="w-full md:w-1/3 px-3 py-2 rounded-lg focus:outline-none text-gray-900 mb-4 md:mb-0 md:mr-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition duration-300"
          >
            Get Valuation
          </button>
        </form>
      </div>
    </div>
  );
};


// FAQ Component (Smaller and Centered)
const FAQ = () => {
  const faqs = [
    {
      question: "How accurate is the property valuation?",
      answer: "Our AI tool uses market data to give a precise estimate. For official advice, consult an agent."
    },
    {
      question: "Is my personal information secure?",
      answer: "Your privacy is our priority, and your data is never shared without consent."
    },
    {
      question: "How quickly can I get my valuation?",
      answer: "Instantly! Get an estimate in seconds after entering your address."
    },
    {
      question: "Can I use this tool to buy a home?",
      answer: "Yes! The tool helps buyers understand the market better."
    },
    {
      question: "Do I need to register?",
      answer: "No registration needed. However, signing up lets you save your estimates."
    },
    {
      question: "Why specialize in the Irish market?",
      answer: "We leverage data specifically from the Irish property market, ensuring that all estimates are based on the most relevant local trends, regulations, and sales data. This makes our valuations more accurate for Irish homeowners compared to global tools."
    },
  ];

  const [expandedIndices, setExpandedIndices] = useState([]);

  const toggleFAQ = (index) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="py-6 bg-white">
      <div className="container mx-auto px-4 max-w-xl">
        <h2 className="text-xl font-bold text-center mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-2">
              <button
                onClick={() => toggleFAQ(index)}
                className="flex justify-between items-center w-full text-left focus:outline-none"
                aria-expanded={expandedIndices.includes(index)}
                aria-controls={`faq-${index}`}
              >
                <span className="text-sm font-semibold text-gray-800">{faq.question}</span>
                <ChevronDown
                  className={`text-blue-600 transition-transform duration-300 ${expandedIndices.includes(index) ? 'transform rotate-180' : ''}`}
                />
              </button>
              {expandedIndices.includes(index) && (
                <p id={`faq-${index}`} className="mt-1 text-gray-600 text-xs">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Footer Component with Smaller and Responsive Font
const Footer = () => {
  console.log("Footer component rendered");
  return (
    <footer className="bg-gray-100 text-gray-600 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm md:text-md font-semibold mb-2">HomeWorth</h3>
            <p className="text-xs md:text-sm">AI-powered home valuations.</p>
          </div>
          <div>
            <h4 className="text-sm md:text-md font-semibold mb-2">Quick Links</h4>
            <ul>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Home</a></li>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">About Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm md:text-md font-semibold mb-2">Legal</h4>
            <ul>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Privacy Policy</a></li>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm md:text-md font-semibold mb-2">Follow Us</h4>
            <ul>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Facebook</a></li>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-6 text-center text-xs md:text-sm">
          <p>&copy; 2024 RealEstateGen. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
export default function RealEstateApp() {
  useEffect(() => {
    console.log("App component rendered");

    // Test connection to Supabase and fetch rows from the table
    const testSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles') // Replace with your actual table name
          .select('*'); // Select all rows

        if (error) {
          console.error('Error accessing Supabase table:', error.message);
        } else if (data.length === 0) {
          console.log('Connected to Supabase, but no rows found in the table.');
        } else {
          console.log('Connected to Supabase. Data:', data);
        }
      } catch (error) {
        console.error('Error testing Supabase connection:', error.message);
      }
    };

    // Run the test
    testSupabaseConnection();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <Header />
      </Suspense>
      <main>
        <PropertyValuationHero />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}