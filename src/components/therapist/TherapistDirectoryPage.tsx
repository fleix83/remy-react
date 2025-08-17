import React, { useState } from 'react'
import TherapistSelector from './TherapistSelector'
import type { Therapist } from '../../types/database.types'

const TherapistDirectoryPage: React.FC = () => {
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)

  const handleTherapistSelect = (therapist: Therapist | null) => {
    setSelectedTherapist(therapist)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Therapist Directory
          </h1>
          <p className="text-gray-600 mb-8">
            Search and explore our directory of qualified therapists.
          </p>
          
          <TherapistSelector 
            selectedTherapist={selectedTherapist}
            onTherapistSelect={handleTherapistSelect}
          />
          
          {selectedTherapist && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Therapist
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Name:</span> {selectedTherapist.form_of_address} {selectedTherapist.first_name} {selectedTherapist.last_name}
                </p>
                <p>
                  <span className="font-medium">Designation:</span> {selectedTherapist.designation}
                </p>
                {selectedTherapist.institution && (
                  <p>
                    <span className="font-medium">Institution:</span> {selectedTherapist.institution}
                  </p>
                )}
                {selectedTherapist.canton && (
                  <p>
                    <span className="font-medium">Canton:</span> {selectedTherapist.canton}
                  </p>
                )}
                {selectedTherapist.description && (
                  <p>
                    <span className="font-medium">Description:</span> {selectedTherapist.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TherapistDirectoryPage