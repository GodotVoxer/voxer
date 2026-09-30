import { describe, expect, it, vi } from "vitest";

import { SidebarPresenceStatus } from "./SidebarPresenceStatus";

let mockOnlineCount: number | null = null;
vi.mock("@/features/presence/store", () => ({
  usePresenceStore: (selector: (state: { onlineCount: number | null }) => unknown) =>
    selector({ onlineCount: mockOnlineCount }),
}));

describe("SidebarPresenceStatus", () => {
  it("shows the number of users online when defined", () => {
    mockOnlineCount = 42;
    const element = SidebarPresenceStatus();
    expect(element.props["aria-label"]).toBe("Usuarios conectados en tiempo real: 42");
  });

  it("shows the connection state when onlineCount is null", () => {
    mockOnlineCount = null;
    const element = SidebarPresenceStatus();
    expect(element.props["aria-label"]).toBe("Conectando al servicio de presencia");
  });
});
