"use client";

import { useState, useEffect } from "react";

// interfaces
import { Customer } from "@/interfaces/customer";
import { Note } from "@/interfaces/note";

export default function CustomerProfilePage() {
  const [id, setId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  // State for the new note form
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteEntityType, setNewNoteEntityType] = useState("");
  const [isPostingNewNote, setIsPostingNewNote] = useState(false);
  const [postNewNoteError, setPostNewNoteError] = useState<string | null>(null);

  // State for file upload on existing notes
  const [noteFileToUpload, setNoteFileToUpload] = useState<File | null>(null);
  const [isUploadingNoteFile, setIsUploadingNoteFile] = useState(false);

  // All notes for customer, now with the correct type
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  // Helper function to simulate UUID generation
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  // Parse the URL to get the customer ID on initial load
  useEffect(() => {
    const pathSegments = window.location.pathname.split("/");
    const customerId = pathSegments[pathSegments.length - 1];
    setId(customerId);
  }, []);

  // Fetch customer data when the ID changes
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch customer details
        const customerResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/customers/${id}`
        );
        if (!customerResponse.ok) {
          throw new Error("Customer not found.");
        }
        const customerData = await customerResponse.json();
        setCustomer(customerData);
        setError(null);
      } catch (err) {
        setError("Failed to fetch customer data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Separate useEffect to fetch notes
  useEffect(() => {
    if (!id) {
      return;
    }

    const fetchNotes = async () => {
      try {
        const notesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/customers/${id}/notes`
        );
        const notesData = notesResponse.ok ? await notesResponse.json() : [];
        setAllNotes(notesData);
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      }
    };

    fetchNotes();
  }, [id]);

  // Handle direct delete action
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // First, delete all notes associated with the customer
      for (const note of allNotes) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/customers/${customer?.customerId}/notes/${note.id}`,
            {
              method: "DELETE",
            }
          );
        } catch (noteDeleteError) {
          console.error(`Failed to delete note ${note.id}:`, noteDeleteError);
        }
      }

      // Then, delete the customer itself
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/${customer?.customerId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete customer.");
      }

      setCustomer(null);

      // Redirect to the dashboard after successful deletion
      window.location.href = "/";
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete customer. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setIsDeletingNote(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/${customer?.customerId}/notes/${noteId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete note.");
      }

      // Update the state to remove the note from the UI
      setAllNotes(allNotes.filter((note) => note.id !== noteId));
      setOpenNoteId(null); // Close the accordion
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeletingNote(false);
    }
  };

  const handlePostNewNote = async () => {
    setIsPostingNewNote(true);
    setPostNewNoteError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/${id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: newNoteTitle,
            content: newNoteContent,
            entityType: newNoteEntityType,
            isPrivate: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to post new note.");
      }

      // Clear the form on success
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteEntityType("");

      // Re-fetch notes to update the list
      const notesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/${id}/notes`
      );
      const notesData = notesResponse.ok ? await notesResponse.json() : [];
      setAllNotes(notesData);
    } catch (err) {
      console.error("Post new note failed:", err);
      setPostNewNoteError("Failed to post new note. Please try again.");
    } finally {
      setIsPostingNewNote(false);
    }
  };

  const handleUploadNoteFile = async (noteId: string) => {
    if (!noteFileToUpload) return;

    setIsUploadingNoteFile(true);
    try {
      // In a real-world app, you would call an API endpoint to get a signed URL
      // for the S3 bucket. Here we will mock the process using a placeholder URL.
      const filename = noteFileToUpload.name;
      const attachmentKey = `notes/${id}/attachments/${noteId}/${filename}`;

      // Simulate the PUT request to the pre-signed S3 URL
      const mockS3PutUrl = `https://leighton-crm-bucket-ja.s3.eu-west-1.amazonaws.com/${attachmentKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=...&x-id=PutObject`;

      const uploadResponse = await fetch(mockS3PutUrl, {
        method: "PUT",
        body: noteFileToUpload,
        headers: {
          "Content-Type": noteFileToUpload.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3.");
      }

      // Now, update the note in your API to include the attachment key and filename
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/${id}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ attachmentKey, filename }),
        }
      );

      // Re-fetch notes to update the list
      const notesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/${id}/notes`
      );
      const notesData = notesResponse.ok ? await notesResponse.json() : [];
      setAllNotes(notesData);
      setNoteFileToUpload(null); // Clear the file input
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setIsUploadingNoteFile(false);
    }
  };

  const toggleAccordion = (noteId: string) => {
    setOpenNoteId(openNoteId === noteId ? null : noteId);
  };

  if (loading) {
    return (
      <div className="p-8 pt-12">
        <p className="text-xl text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 pt-12">
        <p className="text-2xl text-red-500 font-bold mb-4">
          Error: {error || "Customer Not Found"}
        </p>
        <p className="text-gray-600">
          The customer you're looking for could not be found. Please check the
          URL or try again later.
        </p>
        <a href="/" className="mt-4 text-indigo-600 hover:underline">
          &larr; Back to Dashboard
        </a>
      </div>
    );
  }

  // Render the customer's profile
  return (
    <div className="p-8 pt-12">
      <a
        href="/"
        className="mb-8 text-indigo-600 font-medium hover:underline flex items-center gap-2"
      >
        &larr; Back to Dashboard
      </a>

      {/* Main card with customer details and delete button */}
      <div className="bg-white shadow-xl rounded-lg p-8 w-full flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-xl text-gray-600">
            {customer.jobTitle} at {customer.company}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300"
        >
          {isDeleting ? "Deleting..." : "Delete customer"}
        </button>
      </div>

      {/* Two-column layout for information and notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Card: Contact and Address Information */}
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Contact & Address Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="p-4 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Contact
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li>
                  <span className="font-semibold">Email:</span> {customer.email}
                </li>
                <li>
                  <span className="font-semibold">Phone:</span> {customer.phone}
                </li>
              </ul>
            </div>
            {/* Address Information */}
            <div className="p-4 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Address
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li>{customer.address.street}</li>
                <li>
                  {customer.address.city}, {customer.address.state}{" "}
                  {customer.address.postalCode}
                </li>
                <li>{customer.address.country}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Card: New Note Form */}
        <div className="flex flex-col gap-8">
          <div className="bg-white shadow-xl rounded-lg p-8 flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">New Note</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Note Title"
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
              />
              <textarea
                placeholder="Note Content"
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
              />
              <input
                type="text"
                placeholder="Entity Type (e.g., test)"
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newNoteEntityType}
                onChange={(e) => setNewNoteEntityType(e.target.value)}
              />
              {postNewNoteError && (
                <p className="text-red-500 text-sm">{postNewNoteError}</p>
              )}
              <button
                onClick={handlePostNewNote}
                disabled={isPostingNewNote}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
              >
                {isPostingNewNote ? "Adding..." : "Add New Note"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-8 border-t border-gray-300" />

      {/* Accordion for displaying all customer notes */}
      <div className="bg-white shadow-xl rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          All Customer Notes
        </h2>
        {allNotes.length === 0 ? (
          <p className="text-gray-500">No notes found for this customer.</p>
        ) : (
          <div className="space-y-4">
            {allNotes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleAccordion(note.id)}
                  className="flex justify-between items-center w-full p-4 text-left font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg transition-colors duration-200"
                >
                  <span>{note.title}</span>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 ${
                      openNoteId === note.id ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openNoteId === note.id && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-start">
                    <div className="flex-grow mr-4">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
                        {note.content}
                      </p>

                      {/* File upload section for existing notes */}
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        {note.attachmentKey && note.filename ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.586a6 6 0 108.486 8.486L20.5 13"
                              ></path>
                            </svg>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                console.log(
                                  `Simulating download for: ${note.filename}`
                                );
                              }}
                              className="text-indigo-600 hover:underline font-semibold text-sm"
                            >
                              Download {note.filename}
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Add Attachment:
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="file"
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                onChange={(e) =>
                                  setNoteFileToUpload(
                                    e.target.files ? e.target.files[0] : null
                                  )
                                }
                              />
                              <button
                                onClick={() => handleUploadNoteFile(note.id)}
                                disabled={
                                  isUploadingNoteFile || !noteFileToUpload
                                }
                                className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors duration-200 disabled:bg-indigo-300"
                              >
                                {isUploadingNoteFile
                                  ? "Uploading..."
                                  : "Upload"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={isDeletingNote}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300"
                    >
                      {isDeletingNote ? "Deleting..." : "Delete Note"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
