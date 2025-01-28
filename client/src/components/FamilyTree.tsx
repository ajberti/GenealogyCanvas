import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TreeNode, FamilyMember } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FamilyTreeProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  isLoading: boolean;
}

interface D3TreeNode extends d3.HierarchyNode<TreeNode> {
  x: number;
  y: number;
}

export default function FamilyTree({ members, onSelectMember, isLoading }: FamilyTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || isLoading || members.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Transform data into hierarchical structure
    const buildTree = (members: FamilyMember[]): TreeNode => {
      const memberMap = new Map(members.map(m => [m.id, { 
        ...m, 
        children: [] as TreeNode[],
        spouse: undefined as TreeNode | undefined,
        parents: [] as TreeNode[]
      }]));

      members.forEach(member => {
        member.relationships?.forEach(rel => {
          const node = memberMap.get(member.id)!;
          const related = memberMap.get(rel.relatedPersonId);

          if (related && rel.relationType === 'child') {
            node.children?.push(related);
          } else if (related && rel.relationType === 'spouse') {
            node.spouse = related;
          } else if (related && rel.relationType === 'parent') {
            node.parents?.push(related);
          }
        });
      });

      // Find root node (member without parents)
      const roots = Array.from(memberMap.values()).filter(node => !node.parents?.length);
      return roots[0] || memberMap.values().next().value;
    };

    const root = buildTree(members);

    // Clear previous svg
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .append("g")
      .attr("transform", `translate(${width/2},50)`);

    const tree = d3.tree<TreeNode>()
      .nodeSize([80, 160])
      .separation((a: d3.HierarchyNode<TreeNode>, b: d3.HierarchyNode<TreeNode>) => {
        return a.parent === b.parent ? 1 : 1.2;
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

    // Add nodes
    const nodes = svg.selectAll("g.node")
      .data(treeData.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d: D3TreeNode) => `translate(${d.x},${d.y})`);

    nodes.append("circle")
      .attr("r", 5)
      .attr("fill", "hsl(25, 40%, 35%)");

    nodes.append("text")
      .attr("dy", "1.5em")
      .attr("x", -30)
      .attr("text-anchor", "middle")
      .text((d: D3TreeNode) => `${d.data.firstName} ${d.data.lastName}`)
      .attr("class", "text-sm font-serif");

    // Add click handlers
    nodes.on("click", (_: PointerEvent, d: D3TreeNode) => {
      onSelectMember(d.data);
    });

  }, [members, isLoading, onSelectMember]);

  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ overflow: "visible" }}
    />
  );
}