import { NotFoundException } from '@nestjs/common';
import { Document, ClientSession } from 'mongoose';

/**
 * Handles concurrent deletion operations with transaction safety.
 * Returns the soft-deleted document or handles write conflicts gracefully.
 * 
 * @param model - Mongoose model to operate on
 * @param documentId - ID of document to soft delete  
 * @param session - MongoDB transaction session
 * @param resourceName - Name of resource for error messages
 * @returns Promise<T> - The soft-deleted document
 * @throws NotFoundException if document not found or no permission
 */
export async function handleConcurrentSoftDelete<T extends Document & { isDeleted: boolean; isActive: boolean }>(
    model: any,
    documentId: string,
    session: ClientSession,
    resourceName: string
): Promise<T> {
    try {
        // Attempt soft deletion (only if not already deleted)
        const deletedDocument = await model.findOneAndUpdate(
            { _id: documentId, isDeleted: false },
            { isDeleted: true, isActive: false },
            { session, new: true }
        ).exec();

        if (!deletedDocument) {
            // Check if already deleted by concurrent transaction
            const existingDocument = await model.findById(documentId, null, { session }).exec();
            if (existingDocument && existingDocument.isDeleted) {
                return existingDocument; // Idempotent behavior
            } else {
                throw new NotFoundException(`${resourceName} with ID "${documentId}" not found`);
            }
        }

        return deletedDocument;
    } catch (error) {
        // Handle MongoDB write conflict from concurrent transactions
        if (error.message.includes('Write conflict') || error.message.includes('WriteConflict')) {
            const existingDocument = await model.findById(documentId).exec();
            if (existingDocument && existingDocument.isDeleted) {
                return existingDocument; // Already deleted by concurrent transaction
            }
            throw new NotFoundException(`${resourceName} with ID "${documentId}" not found`);
        }
        throw error; // Re-throw other errors
    }
}
