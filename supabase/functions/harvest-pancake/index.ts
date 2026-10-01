import { createWalletClient, http, publicActions, parseAbi } from 'npm:viem'
import { privateKeyToAccount } from 'npm:viem/accounts'
import { bsc } from 'npm:viem/chains'

const MASTERCHEF_V3_ADDRESS = '0x556B9306565093C855AEA9AE92A594704c2Cd59e'
const TOKEN_ID = 7594104n // Tu Token ID de PancakeSwap V3

const MASTERCHEF_ABI = parseAbi([
  'function harvest(uint256 tokenId, address to) external',
  'function userPositionInfos(uint256 tokenId) external view returns (uint128 liquidity, uint128 boostLiquidity, int24 tickLower, int24 tickUpper, uint256 rewardGrowthInside, uint256 reward, address user, uint256 pid, uint256 boostMultiplier)'
])

Deno.serve(async (req) => {
  try {
    const privateKey = Deno.env.get('BOT_PRIVATE_KEY')
    const rpcUrl = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed1.binance.org'

    if (!privateKey) {
      throw new Error('Falta BOT_PRIVATE_KEY en los Secrets de Supabase')
    }

    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`)
    const client = createWalletClient({
      account,
      chain: bsc,
      transport: http(rpcUrl)
    }).extend(publicActions)

    const { request } = await client.simulateContract({
      address: MASTERCHEF_V3_ADDRESS,
      abi: MASTERCHEF_ABI,
      functionName: 'harvest',
      args: [TOKEN_ID, account.address],
    })

    const txHash = await client.writeContract(request)
    const receipt = await client.waitForTransactionReceipt({ hash: txHash })

    return new Response(
      JSON.stringify({ success: true, txHash: receipt.transactionHash }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
