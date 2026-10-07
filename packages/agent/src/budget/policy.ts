export interface PlanPolicy {
  canCreateProject(ownerId: string, currentProjectCount: number): Promise<boolean>;
  canPublish(ownerId: string, projectId: string): Promise<boolean>;
}

export class AllowAllPlanPolicy implements PlanPolicy {
  async canCreateProject(_ownerId: string, _currentProjectCount: number): Promise<boolean> {
    return true;
  }

  async canPublish(_ownerId: string, _projectId: string): Promise<boolean> {
    return true;
  }
}
