'use client';

import React, { Suspense, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Header Component
const Header = () => (
  <header className="bg-white shadow-sm">
    <nav className="container mx-auto px-6 py-3">
      <div className="flex justify-between items-center">
        <div className="text-xl font-bold text-blue-700">RealEstateGen</div>
        <div className="hidden md:flex space-x-6">
          <a href="#" className="text-gray-600 hover:text-blue-700">Home</a>
          <a href="#" className="text-gray-600 hover:text-blue-700">About</a>
          {/* Removed 'Features' and 'Contact' links as per request */}
        </div>
      </div>
    </nav>
  </header>
);

// PropertyValuationHero Component with Updated Hero Statement and Substatement
const PropertyValuationHero = () => {
  const [address, setAddress] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (address.trim() === '') {
      alert('Please enter your home address.');
    } else {
      // Here you can integrate with your backend or API to handle the valuation request
      alert(`Valuation requested for: ${address}`);
    }
  };

  return (
    <div className="bg-[#e8e5de] text-gray-800 py-20">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-5xl font-bold mb-4">Get Your Home Valuation Instantly</h1>
        <p className="text-xl mb-8">
          Receive a digital valuation based on local market trends and precision algorithms. No deadlines, no waiting—get more accurate estimates effortlessly.
        </p>
        <form onSubmit={handleSubmit} className="flex justify-center flex-col md:flex-row items-center">
          <input
            type="text"
            placeholder="Enter your home address"
            className="w-full md:w-2/3 px-4 py-2 rounded-lg focus:outline-none text-gray-900 mb-4 md:mb-0 md:mr-4"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition duration-300">
            Get Your Estimate
          </button>
        </form>
      </div>
    </div>
  );
};

// FAQ Component with Updated Content for Irish Market Targeting Sellers and Buyers
const FAQ = () => {
  const faqs = [
    {
      question: "How accurate is the property valuation?",
      answer: "Our AI-powered tool uses the latest market data and recent sales in your area to provide a highly accurate estimate of your property's value. While it's a great starting point, for an official appraisal, consider consulting a local estate agent."
    },
    {
      question: "Is my personal information secure?",
      answer: "Absolutely. We prioritize your privacy and ensure that all your data is securely handled. Your address and personal details are never shared with third parties without your consent."
    },
    {
      question: "How quickly can I get my property valuation?",
      answer: "Instantly! Once you enter your address, our AI analyzes the current market trends and comparable sales to provide your property's estimated value within seconds."
    },
    {
      question: "Can I use this tool if I'm planning to buy a home?",
      answer: "Yes! Whether you're buying or selling, our valuation tool helps you understand the market better. Buyers can use it to gauge property values and make informed decisions."
    },
    {
      question: "What makes RealEstateGen different from other valuation tools?",
      answer: "RealEstateGen combines advanced AI algorithms with up-to-date Irish market data, ensuring more accurate and reliable valuations. Our user-friendly interface and instant results make the property valuation process seamless."
    },
    {
      question: "Do I need to register to use the valuation tool?",
      answer: "No registration is required to get an instant property valuation. Simply enter your address and receive your estimate immediately. However, registering allows you to save your valuations and access additional features."
    },
    {
      question: "How often is the market data updated?",
      answer: "Our platform updates market data regularly to reflect the latest trends and sales in the Irish real estate market, ensuring your property valuation is based on the most current information available."
    },
    {
      question: "Can I trust the valuation for making financial decisions?",
      answer: "While our AI-powered valuation provides a reliable estimate based on comprehensive data, it's recommended to consult with a local real estate professional for major financial decisions related to buying or selling your property."
    }
  ];

  // State to track which FAQs are expanded
  const [expandedIndices, setExpandedIndices] = useState([]);

  const toggleFAQ = (index) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <button
                onClick={() => toggleFAQ(index)}
                className="flex justify-between items-center w-full text-left focus:outline-none"
                aria-expanded={expandedIndices.includes(index)}
                aria-controls={`faq-${index}`}
              >
                <span className="text-lg font-semibold text-gray-800">{faq.question}</span>
                <ChevronDown
                  className={`text-blue-600 transition-transform duration-300 ${expandedIndices.includes(index) ? 'transform rotate-180' : ''
                    }`}
                />
              </button>
              {expandedIndices.includes(index) && (
                <p
                  id={`faq-${index}`}
                  className="mt-2 text-gray-600"
                >
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Footer Component
const Footer = () => (
  <footer className="bg-gray-100 text-gray-600 py-10">
    <div className="container mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">RealEstateGen</h3>
          <p>Revolutionizing the real estate market in Ireland with AI-powered valuations.</p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-blue-600">Home</a></li>
            <li><a href="#" className="hover:text-blue-600">About Us</a></li>
            {/* Removed 'Features' and 'Contact' links as per request */}
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Legal</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
            <li><a href="#" className="hover:text-blue-600">Cookie Policy</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Connect With Us</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-blue-600">Facebook</a></li>
            <li><a href="#" className="hover:text-blue-600">Twitter</a></li>
            <li><a href="#" className="hover:text-blue-600">LinkedIn</a></li>
            <li><a href="#" className="hover:text-blue-600">Instagram</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-gray-200 text-center">
        <p>&copy; 2024 RealEstateGen. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

// Main App Component
export default function RealEstateApp() {
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
