import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TreeNode, FamilyMember } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface FamilyTreeProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  isLoading: boolean;
}

interface D3TreeNode extends d3.HierarchyNode<TreeNode> {
  x: number;
  y: number;
}

const formatDate = (date: string | undefined) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy');
};

export default function FamilyTree({ members, onSelectMember, isLoading }: FamilyTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || isLoading || members.length === 0) return;

    // Set fixed dimensions for the tree
    const width = 1200; // Fixed width for the SVG
    const height = 1200; // Fixed height for the SVG

    // Clear previous svg
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2},50)`);

    // Transform data into hierarchical structure
    const buildTree = (members: FamilyMember[]): TreeNode => {
      const memberMap = new Map(members.map(m => [m.id, { 
        ...m, 
        children: [] as TreeNode[],
        spouse: undefined as TreeNode | undefined,
        parents: [] as TreeNode[]
      }]));

      // First pass: establish all relationships
      members.forEach(member => {
        member.relationships?.forEach(rel => {
          const node = memberMap.get(member.id)!;
          const related = memberMap.get(rel.relatedPersonId);

          if (related) {
            if (rel.relationType === 'child') {
              node.children?.push(related);
            } else if (rel.relationType === 'spouse') {
              node.spouse = related;
            } else if (rel.relationType === 'parent') {
              node.parents?.push(related);
            }
          }
        });
      });

      // Find root node (member without parents or with only spouse relationship)
      const roots = Array.from(memberMap.values()).filter(node => 
        !node.parents?.length && (!node.spouse || node.id < node.spouse.id)
      );
      return roots[0] || memberMap.values().next().value;
    };

    const root = buildTree(members);

    // Increased node sizing for spouse pairs
    const tree = d3.tree<TreeNode>()
      .nodeSize([160, 200])
      .separation((a: d3.HierarchyNode<TreeNode>, b: d3.HierarchyNode<TreeNode>) => {
        return a.parent === b.parent ? 1.5 : 2;
      });

    const hierarchy = d3.hierarchy(root);
    const treeData = tree(hierarchy);

    // Add links
    svg.selectAll("path.link")
      .data(treeData.links())
      .join("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<d3.HierarchyLink<TreeNode>, d3.HierarchyPointLink<TreeNode>>()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .attr("fill", "none")
      .attr("stroke", "hsl(25, 40%, 35%)")
      .attr("stroke-width", 1);

    // Add spouse links
    const spouseLinks = svg.selectAll("path.spouse-link")
      .data(treeData.descendants().filter((d: D3TreeNode) => d.data.spouse))
      .join("path")
      .attr("class", "spouse-link")
      .attr("d", (d: D3TreeNode) => {
        const startX = d.x;
        const endX = d.x + 80;
        const y = d.y;
        return `M${startX},${y} L${endX},${y}`;
      })
      .attr("stroke", "hsl(25, 40%, 35%)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");

    // Add nodes
    const nodes = svg.selectAll("g.node")
      .data(treeData.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d: D3TreeNode) => `translate(${d.x},${d.y})`);

    // Add spouse nodes
    const spouseNodes = svg.selectAll("g.spouse-node")
      .data(treeData.descendants().filter((d: D3TreeNode) => d.data.spouse))
      .join("g")
      .attr("class", "spouse-node")
      .attr("transform", (d: D3TreeNode) => `translate(${d.x + 80},${d.y})`);

    // Style nodes
    nodes.append("circle")
      .attr("r", 5)
      .attr("fill", "hsl(25, 40%, 35%)");

    // Add text elements for name and dates
    const nodeTexts = nodes.append("g")
      .attr("transform", "translate(-40, 0)");

    // Add name text
    nodeTexts.append("text")
      .attr("dy", "1.5em")
      .attr("text-anchor", "middle")
      .text((d: D3TreeNode) => `${d.data.firstName} ${d.data.lastName}`)
      .attr("class", "text-sm font-serif");

    // Add dates text
    nodeTexts.append("text")
      .attr("dy", "3em")
      .attr("text-anchor", "middle")
      .attr("class", "text-xs text-muted-foreground")
      .text((d: D3TreeNode) => {
        const birth = formatDate(d.data.birthDate);
        const death = formatDate(d.data.deathDate);
        return death ? `${birth} - ${death}` : birth ? `b. ${birth}` : '';
      });

    // Style spouse nodes
    spouseNodes.append("circle")
      .attr("r", 5)
      .attr("fill", "hsl(25, 40%, 35%)");

    // Add text elements for spouse name and dates
    const spouseTexts = spouseNodes.append("g")
      .attr("transform", "translate(40, 0)");

    // Add spouse name text
    spouseTexts.append("text")
      .attr("dy", "1.5em")
      .attr("text-anchor", "middle")
      .text((d: D3TreeNode) => `${d.data.spouse?.firstName} ${d.data.spouse?.lastName}`)
      .attr("class", "text-sm font-serif");

    // Add spouse dates text
    spouseTexts.append("text")
      .attr("dy", "3em")
      .attr("text-anchor", "middle")
      .attr("class", "text-xs text-muted-foreground")
      .text((d: D3TreeNode) => {
        if (!d.data.spouse) return '';
        const birth = formatDate(d.data.spouse.birthDate);
        const death = formatDate(d.data.spouse.deathDate);
        return death ? `${birth} - ${death}` : birth ? `b. ${birth}` : '';
      });

    // Add click handlers
    nodes.on("click", (_: PointerEvent, d: D3TreeNode) => {
      onSelectMember(d.data);
    });

    spouseNodes.on("click", (_: PointerEvent, d: D3TreeNode) => {
      if (d.data.spouse) {
        onSelectMember(d.data.spouse);
      }
    });

  }, [members, isLoading, onSelectMember]);

  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <Card className="w-full h-full">
      <ScrollArea className="h-full w-full" orientation="both">
        <div className="relative w-full h-full min-w-[1200px] min-h-[800px]">
          <svg
            ref={svgRef}
            className="absolute inset-0"
          />
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </Card>
  );
}