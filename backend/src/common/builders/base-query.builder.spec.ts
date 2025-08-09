import { ForbiddenException } from '@nestjs/common';
import { BaseQueryBuilder } from './base-query.builder';

describe('BaseQueryBuilder', () => {
    // Test Case: The default behavior for a regular user.
    it('should create a default filter for active, non-deleted records', () => {
        const query = {};
        const userRole = 'Grower';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: false,
            isActive: true,
        });
    });

    // Test Case: An admin wants to include inactive records.
    it('should return non-deleted records, both active and inactive, when includeInactives is true', () => {
        const query = { includeInactives: true };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: false,
            isActive: { $in: [true, false] },
        });
    });

    // Test Case: An admin user wants to query for ONLY inactive records.
    it('should filter for only inactive records when isActive is explicitly false', () => {
        const query = { isActive: false };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: false,
            isActive: false,
        });
    });

    // Test Case: An admin user wants to query for ONLY active records.
    it('should filter for only active records when isActive is explicitly true', () => {
        const query = { isActive: true };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: false,
            isActive: true,
        });
    });

    // Test Case: An admin wants to view the recycling bin
    it('should return only deleted records when isDeleted is true for an Admin', () => {
        const query = { isDeleted: true };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: true,
        });
    });

    // Test Case: A regular user attempts to view the recycling bin
    it('should throw a ForbiddenException if a non-admin tries to view deleted records', () => {
        const query = { isDeleted: true };
        const userRole = 'Grower';

        const builder = new BaseQueryBuilder(query, userRole);
        expect(() => builder.build()).toThrow(ForbiddenException);
        expect(() => builder.build()).toThrow('You do not have permission to view deleted records.');
    });

    // Test Case: A confusing query that mixes isDeleted and includeInactives.
    // This tests the logic that should prioritize isDeleted over other status filters.
    it('should ignore other status filters like includeInactives when isDeleted is true', () => {
        const query = { isDeleted: true, includeInactives: true };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: true,
        });
    });


    // Test Case: A confusing query that mixes includeInactives and isActive.
    // This tests the logic that should prioritize includeInactives over a specific isActive query
    it('should prioritize includeInactives over a specific isActive query', () => {
        const query = { includeInactives: true, isActive: false };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toEqual({
            isDeleted: false,
            isActive: { $in: [true, false] },
        });
    });

    // Test Case: Searching by name.
    it('should add a case-insensitive regex filter for name', () => {
        const query = { name: 'Test' };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toHaveProperty('name', { $regex: 'Test', $options: 'i' });
        expect(filter).not.toHaveProperty('recordId');
        expect(filter).toHaveProperty('isDeleted', false);
        expect(filter).toHaveProperty('isActive', true);
    });

    // Test Case: Searching by ONLY the recordId.
    it('should add a case-insensitive regex filter for recordId only', () => {
        const query = { recordId: 'REC-001' };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toHaveProperty('recordId', { $regex: 'REC-001', $options: 'i' });
        expect(filter).not.toHaveProperty('name');
        expect(filter).toHaveProperty('isDeleted', false);
        expect(filter).toHaveProperty('isActive', true);
    });

    // Test Case: Searching by BOTH name and recordId.
    it('should add regex filters for both name and recordId when both are provided', () => {
        const query = { name: 'Test', recordId: 'REC-001' };
        const userRole = 'Administrator';

        const builder = new BaseQueryBuilder(query, userRole);
        const filter = builder.build();

        expect(filter).toHaveProperty('name', { $regex: 'Test', $options: 'i' });
        expect(filter).toHaveProperty('recordId', { $regex: 'REC-001', $options: 'i' });
        expect(filter).toHaveProperty('isDeleted', false);
        expect(filter).toHaveProperty('isActive', true);
    });
});