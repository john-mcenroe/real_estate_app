// src/components/Modal.js
"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import PropTypes from "prop-types"; // Optional: For prop type validation

const Modal = ({ isModalOpen, setIsModalOpen, onSubmit }) => {
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [size, setSize] = useState("");

  const DEFAULT_BEDS = 3;
  const DEFAULT_BATHS = 2;
  const DEFAULT_SIZE = 120;

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const parsedBeds = parseFloat(beds);
    const parsedBaths = parseFloat(baths);
    const parsedSize = parseFloat(size);

    const finalBeds =
      !isNaN(parsedBeds) && parsedBeds > 0 ? parsedBeds : DEFAULT_BEDS;
    const finalBaths =
      !isNaN(parsedBaths) && parsedBaths > 0 ? parsedBaths : DEFAULT_BATHS;
    const finalSize =
      !isNaN(parsedSize) && parsedSize > 0 ? parsedSize : DEFAULT_SIZE;

    // Pass the values back to the parent component
    onSubmit({
      beds: finalBeds,
      baths: finalBaths,
      size: finalSize,
    });

    // Close the modal
    setIsModalOpen(false);
  };

  return (
    <Transition appear show={isModalOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setIsModalOpen(false)}
      >
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
                  <Dialog.Title as="h2" className="text-lg font-semibold">
                    Enter Property Details
                  </Dialog.Title>
                  <button
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
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
                    <label
                      htmlFor="beds"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Number of Beds
                    </label>
                    <input
                      type="number"
                      id="beds"
                      name="beds"
                      min="1"
                      step="1"
                      placeholder={`Default: ${DEFAULT_BEDS}`}
                      value={beds}
                      onChange={(e) => setBeds(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Baths Input */}
                  <div>
                    <label
                      htmlFor="baths"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Number of Baths
                    </label>
                    <input
                      type="number"
                      id="baths"
                      name="baths"
                      min="1"
                      step="1"
                      placeholder={`Default: ${DEFAULT_BATHS}`}
                      value={baths}
                      onChange={(e) => setBaths(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Size Input */}
                  <div>
                    <label
                      htmlFor="size"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Size (m²)
                    </label>
                    <input
                      type="number"
                      id="size"
                      name="size"
                      min="1"
                      step="0.1"
                      placeholder={`Default: ${DEFAULT_SIZE} m²`}
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
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

// Optional: Define prop types for better type checking
Modal.propTypes = {
  isModalOpen: PropTypes.bool.isRequired,
  setIsModalOpen: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default Modal;
