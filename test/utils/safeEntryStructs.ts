import { TokenType } from "./tokenType";

export type ERC20SafeEntryStruct = {
  contractAddress: string;
};

export type ERC721SafeEntryStruct = {
  contractAddress: string;
  tokenId: number;
};

export type ERC1155SafeEntryStruct = {
  contractAddress: string;
  tokenId: number;
};

export type SafeEntryStruct = {
  tokenType: TokenType; 
  contractAddress: string;
  tokenId: number;
}