"use client"

import { TrendingUp } from "lucide-react"
import {
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    XAxis,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "Multi-line chart for income and expense"



const chartConfig = {
    income: {
        label: "Income",
        color: "#0566ff"
    },
    expense: {
        label: "Expense",
        color: "#8ec5ff"
    },
}

export function ChartLineLabel({ chartData, title, date }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{date}</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 20, left: 12, right: 12 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" />}
                        />
                        <Line
                            dataKey="income"
                            type="monotone"
                            stroke={chartConfig.income.color}
                            strokeWidth={2}
                            dot={{ fill: chartConfig.income.color }}
                            activeDot={{ r: 6 }}
                        >
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Line>
                        <Line
                            dataKey="expense"
                            type="monotone"
                            stroke={chartConfig.expense.color}
                            strokeWidth={2}
                            dot={{ fill: chartConfig.expense.color }}
                            activeDot={{ r: 6 }}
                        >
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Line>
                    </LineChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 leading-none font-medium">
                    Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground leading-none">
                    Showing income vs. expenses for last 6 months
                </div>
            </CardFooter>
        </Card>
    )
}
