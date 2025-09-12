export interface UpdateNote {
    title: string;
    content: string;
    entityType: 'Contact' | 'Lead' | 'Opportunity' | 'Account';
    isPrivate?: false;
}