/**
 * A GitHub Issue.
 */
export default class Issue {
  /**
   * Constructs an Issue from its URL.
   *
   * @param url URL to construct the Issue from
   */
  static async fromUrl(url: string): Promise<Issue> {
    return {}
  }

  /**
   * Closes the Issue.
   */
  async close() {
    return
  }

  /**
   * Determines if the Issue has expired based on the dates in its title.
   */
  isExpired(): boolean {
    return false
  }
}
