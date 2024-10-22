// src/components/Modal.js

"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import PropTypes from "prop-types";

const Modal = ({ isModalOpen, setIsModalOpen, onSubmit, initialValues }) => {
  const [inputs, setInputs] = useState(initialValues);

  // Set inputs only when the modal is opened
  useEffect(() => {
    if (isModalOpen) {
      setInputs(initialValues);
    }
  }, [isModalOpen, initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    console.log("Modal Inputs:", inputs); // **Debugging Log**
    onSubmit(inputs);
    setIsModalOpen(false);
  };

  return (
    <Transition appear show={isModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-neutral-focus bg-opacity-50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full overflow-hidden items-center justify-center p-2">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-md transform text-left align-middle shadow-xl transition-all rounded-xl bg-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h2" className="text-lg font-semibold">Enter Property Details</Dialog.Title>
                  <button
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path
                        fillRule="evenodd"
                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Beds Input */}
                  <div>
                    <label htmlFor="beds" className="block text-sm font-medium text-gray-700">Number of Beds</label>
                    <input
                      type="number"
                      id="beds"
                      name="beds"
                      min="1"
                      step="1"
                      value={inputs.beds}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  {/* Baths Input */}
                  <div>
                    <label htmlFor="baths" className="block text-sm font-medium text-gray-700">Number of Baths</label>
                    <input
                      type="number"
                      id="baths"
                      name="baths"
                      min="1"
                      step="1"
                      value={inputs.baths}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  {/* Size Input */}
                  <div>
                    <label htmlFor="size" className="block text-sm font-medium text-gray-700">Size (m²)</label>
                    <input
                      type="text"
                      id="size"
                      name="size"
                      value={inputs.size}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter size in m²"
                      required
                    />
                  </div>
                  {/* Property Type Input */}
                  <div>
                    <label htmlFor="property_type" className="block text-sm font-medium text-gray-700">Property Type</label>
                    <select
                      id="property_type"
                      name="property_type"
                      value={inputs.property_type}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select property type</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                    </select>
                  </div>
                  {/* BER Rating Input */}
                  <div>
                    <label htmlFor="ber_rating" className="block text-sm font-medium text-gray-700">BER Rating</label>
                    <select
                      id="ber_rating"
                      name="ber_rating"
                      value={inputs.ber_rating}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select BER rating</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="G">G</option>
                    </select>
                  </div>
                  {/* Submit Button */}
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold transition duration-300"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

Modal.propTypes = {
  isModalOpen: PropTypes.bool.isRequired,
  setIsModalOpen: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialValues: PropTypes.object.isRequired,
};

export default Modal;
