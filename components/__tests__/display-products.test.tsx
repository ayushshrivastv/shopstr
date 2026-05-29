import { render, screen, waitFor } from "@testing-library/react";
import DisplayProducts from "../display-products";
import {
  FollowsContext,
  ProductContext,
  ProfileMapContext,
  RelaysContext,
} from "@/utils/context/context";
import {
  NostrContext,
  SignerContext,
} from "@/components/utility-components/nostr-context-provider";
import { NostrManager } from "@/utils/nostr/nostr-manager";

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    query: {},
    pathname: "/marketplace",
    asPath: "/marketplace",
  })),
}));

jest.mock(
  "../utility-components/product-card",
  () =>
    function MockProductCard({
      productData,
    }: {
      productData: { title: string };
    }) {
      return <div>{productData.title}</div>;
    }
);

jest.mock("../display-product-modal", () => () => null);
jest.mock("@/utils/nostr/nostr-helper-functions", () => ({
  deleteEvent: jest.fn(),
}));
jest.mock("@/utils/db/db-client", () => ({
  cacheEventsToDatabase: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/utils/url-slugs", () => ({
  getListingSlug: jest.fn(),
}));

describe("DisplayProducts search filtering", () => {
  it("matches literal special characters in search queries", async () => {
    render(
      <SignerContext.Provider
        value={{ pubkey: "viewer-pubkey", isLoggedIn: true }}
      >
        <NostrContext.Provider value={{ nostr: {} as unknown as NostrManager }}>
          <ProfileMapContext.Provider
            value={{
              profileData: new Map(),
              isLoading: false,
              updateProfileData: jest.fn(),
            }}
          >
            <FollowsContext.Provider
              value={{
                followList: [],
                firstDegreeFollowsLength: 0,
                isLoading: false,
              }}
            >
              <ProductContext.Provider
                value={{
                  productEvents: [
                    {
                      id: "product-1",
                      pubkey: "seller-pubkey",
                      created_at: 1,
                      kind: 30018,
                      tags: [
                        ["title", "C++ Guide"],
                        ["summary", "A beginner-friendly manual"],
                        ["price", "10", "USD"],
                        ["image", "https://example.com/guide.png"],
                      ],
                      content: "content",
                      sig: "sig",
                    },
                  ],
                  isLoading: false,
                  addNewlyCreatedProductEvent: jest.fn(),
                  removeDeletedProductEvent: jest.fn(),
                }}
              >
                <DisplayProducts
                  selectedCategories={new Set()}
                  selectedLocation=""
                  selectedSearch="c++"
                />
              </ProductContext.Provider>
            </FollowsContext.Provider>
          </ProfileMapContext.Provider>
        </NostrContext.Provider>
      </SignerContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("C++ Guide")).toBeInTheDocument();
    });
  });

  it("shows marketplace listings returned by NIP-50 relay search", async () => {
    const nostr = {
      fetch: jest.fn().mockResolvedValue([
        {
          id: "relay-product-1",
          pubkey: "relay-seller",
          created_at: 10,
          kind: 30402,
          tags: [
            ["d", "relay-coffee"],
            ["title", "Relay Coffee Beans"],
            ["summary", "Fresh coffee discovered through relay search"],
            ["price", "12", "USD"],
            ["image", "https://example.com/coffee.png"],
          ],
          content: "Fresh coffee discovered through relay search",
          sig: "relay-sig",
        },
      ]),
    };

    render(
      <SignerContext.Provider
        value={{ pubkey: "viewer-pubkey", isLoggedIn: true }}
      >
        <NostrContext.Provider
          value={{ nostr: nostr as unknown as NostrManager }}
        >
          <RelaysContext.Provider
            value={{
              relayList: ["wss://relay.example"],
              readRelayList: [],
              writeRelayList: [],
              isLoading: false,
            }}
          >
            <ProfileMapContext.Provider
              value={{
                profileData: new Map(),
                isLoading: false,
                updateProfileData: jest.fn(),
              }}
            >
              <FollowsContext.Provider
                value={{
                  followList: [],
                  firstDegreeFollowsLength: 0,
                  isLoading: false,
                }}
              >
                <ProductContext.Provider
                  value={{
                    productEvents: [],
                    isLoading: false,
                    addNewlyCreatedProductEvent: jest.fn(),
                    removeDeletedProductEvent: jest.fn(),
                  }}
                >
                  <DisplayProducts
                    selectedCategories={new Set()}
                    selectedLocation=""
                    selectedSearch="coffee"
                  />
                </ProductContext.Provider>
              </FollowsContext.Provider>
            </ProfileMapContext.Provider>
          </RelaysContext.Provider>
        </NostrContext.Provider>
      </SignerContext.Provider>
    );

    await waitFor(() => {
      expect(nostr.fetch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ kinds: [30402], search: "coffee" }),
        ]),
        {},
        ["wss://relay.example"]
      );
      expect(screen.getByText("Relay Coffee Beans")).toBeInTheDocument();
    });
  });
});
