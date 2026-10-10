import type { StudentCommunityRepository } from '../../src/modules/student-community/student-community.repository.js';
import type {
  CommunityGroup,
  CommunityMessage,
  ConversationDetail,
  ConversationSummary,
} from '../../src/modules/student-community/student-community.types.js';

export class InMemoryStudentCommunityRepository implements StudentCommunityRepository {
  constructor(
    private readonly userId: string,
    private readonly roleId: string,
    private readonly conversation: ConversationDetail,
    private readonly sampleGroup: CommunityGroup,
  ) {}
  async findStudentRoleAssignmentId(userId: string) {
    return userId === this.userId ? this.roleId : null;
  }
  async inbox(userId: string, kind?: 'group' | 'direct'): Promise<ConversationSummary[]> {
    return userId === this.userId && (!kind || kind === this.conversation.kind)
      ? [
          {
            id: this.conversation.id,
            kind: this.conversation.kind,
            title: this.conversation.title,
            preview: this.conversation.preview,
            updatedAt: this.conversation.updatedAt,
          },
        ]
      : [];
  }
  async sent(userId: string) {
    return userId === this.userId ? this.conversation.messages : [];
  }
  async groups(userId: string) {
    return userId === this.userId ? [this.sampleGroup] : [];
  }
  async group(userId: string, id: string) {
    return userId === this.userId && id === this.sampleGroup.id ? this.conversation : null;
  }
  async direct(userId: string, id: string) {
    return userId === this.userId && id === this.conversation.id ? this.conversation : null;
  }
  async joinGroup(userId: string, id: string) {
    return userId === this.userId && id === this.sampleGroup.id
      ? { ...this.sampleGroup, joined: true }
      : null;
  }
  async send(userId: string, id: string, body: string): Promise<CommunityMessage | null> {
    if (userId !== this.userId || id !== this.conversation.id) return null;
    const message = {
      id: '00000000-0000-4000-8000-000000000099',
      body,
      createdAt: new Date().toISOString(),
      sender: { id: userId, displayName: 'Student' },
    };
    this.conversation.messages.push(message);
    return message;
  }
}
